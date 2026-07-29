/**
 * escpos_bluetooth.js
 * ─────────────────────────────────────────────────────────────────────────
 * Handles Web Bluetooth connection to a generic 58mm ESC/POS thermal printer
 * and auto-prints a receipt after a successful order.
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

const BluetoothPrinter = (function () {
    'use strict';

    // ── Common ESC/POS Bluetooth service / characteristic UUIDs ──────────
    // Most generic 58mm printers expose one of these
    const CANDIDATE_SERVICES = [
        '000018f0-0000-1000-8000-00805f9b34fb', // common generic
        '0000ff00-0000-1000-8000-00805f9b34fb', // generic alt
        '0000ffe0-0000-1000-8000-00805f9b34fb', // HC-05/06 style
        '00001101-0000-1000-8000-00805f9b34fb', // SPP (some printers)
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Star / Epson BLE
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // newer generics
    ];

    const CANDIDATE_CHARS = [
        '00002af1-0000-1000-8000-00805f9b34fb',
        '0000ff02-0000-1000-8000-00805f9b34fb',
        '0000ff01-0000-1000-8000-00805f9b34fb',
        '0000ffe1-0000-1000-8000-00805f9b34fb',
        'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
        '49535343-8841-43f4-a8d4-ecbe34729bb3',
    ];

    // ── State ─────────────────────────────────────────────────────────────
    let _device     = null;
    let _server     = null;
    let _char       = null;
    let _connected  = false;

    // ── ESC/POS helpers ───────────────────────────────────────────────────
    const ESC = 0x1B;
    const GS  = 0x1D;
    const LF  = 0x0A;

    function cmd(...bytes) { return new Uint8Array(bytes); }

    const INIT        = cmd(ESC, 0x40);                        // Initialize
    const ALIGN_CTR   = cmd(ESC, 0x61, 0x01);                 // Center
    const ALIGN_LEFT  = cmd(ESC, 0x61, 0x00);                 // Left
    const BOLD_ON     = cmd(ESC, 0x45, 0x01);
    const BOLD_OFF    = cmd(ESC, 0x45, 0x00);
    const FONT_NORMAL = cmd(ESC, 0x21, 0x00);                 // Normal size
    const FONT_LARGE  = cmd(ESC, 0x21, 0x30);                 // Double width+height
    const FONT_MED    = cmd(ESC, 0x21, 0x10);                 // Double height
    const CUT         = cmd(GS,  0x56, 0x42, 0x00);           // Partial cut
    const FEED3       = cmd(LF, LF, LF);

    // Encode a string to Uint8Array (Latin-1 for thermal printers)
    function encode(str) {
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            const c = str.charCodeAt(i);
            bytes.push(c < 256 ? c : 0x3F); // replace non-latin with '?'
        }
        return new Uint8Array(bytes);
    }

    // Pad / truncate string to fit 32-char 58mm line
    function padLine(left, right, width) {
        width = width || 32;
        const pad = width - left.length - right.length;
        if (pad <= 0) return (left + ' ' + right).substring(0, width);
        return left + ' '.repeat(pad) + right;
    }

    // Divider line
    function divider(char, width) {
        width = width || 32;
        return (char || '-').repeat(width);
    }

    // Merge multiple Uint8Arrays into one
    function mergeBytes(arrays) {
        const total = arrays.reduce((s, a) => s + a.length, 0);
        const out   = new Uint8Array(total);
        let offset  = 0;
        for (const arr of arrays) {
            out.set(arr, offset);
            offset += arr.length;
        }
        return out;
    }

    // ── Paper width: 58mm thermal paper prints 32 characters per line at
    //    normal (non-double-width) font. Every divider/column layout below
    //    is sized against this constant so it stays correct on 58mm rolls. ──
    const PAPER_WIDTH = 32;

    // Pad three columns into one line: first col left-aligned, middle col
    // centered, last col right-aligned. Column widths must sum to <= PAPER_WIDTH.
    function padCols(cols, widths) {
        let out = '';
        for (let i = 0; i < cols.length; i++) {
            const w = widths[i];
            let text = String(cols[i]);
            if (text.length > w) text = text.substring(0, w);
            if (i === cols.length - 1) {
                out += text.padStart(w, ' ');
            } else if (i === 0) {
                out += text.padEnd(w, ' ');
            } else {
                const pad = w - text.length;
                const left = Math.floor(pad / 2), right = pad - left;
                out += ' '.repeat(left) + text + ' '.repeat(right);
            }
        }
        return out;
    }

    // ── ESC/POS native QR code (GS ( k — 2D barcode, model 2) ─────────────
    // Supported by the large majority of generic 58mm ESC/POS printers.
    function qrCode(url) {
        if (!url) return new Uint8Array(0);
        const data     = encode(url);
        const storeLen = data.length + 3;
        const pL = storeLen & 0xFF, pH = (storeLen >> 8) & 0xFF;

        const selectModel = cmd(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
        const setSize      = cmd(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06); // module size 6
        const setEC        = cmd(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31); // EC level M
        const storeHeader  = cmd(GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30);
        const printCmd     = cmd(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);

        return mergeBytes([selectModel, setSize, setEC, storeHeader, data, printCmd]);
    }

    // ── Build receipt bytes ───────────────────────────────────────────────
    function buildReceipt(order, settings) {
        const parts = [];

        const push = (...arrays) => parts.push(...arrays);

        push(INIT);

        // ── Header ────────────────────────────────────────────────────────
        push(ALIGN_CTR, BOLD_ON, FONT_LARGE);
        push(encode(settings.store_name || 'Twist & Roll'), cmd(LF));
        push(FONT_NORMAL, BOLD_OFF);
        push(encode((settings.store_name || 'Twist & Roll').toUpperCase()), cmd(LF));

        if (settings.store_address) {
            push(encode(settings.store_address), cmd(LF));
        }
        if (settings.store_contact) {
            push(encode(settings.store_contact), cmd(LF));
        }
        if (settings.receipt_header) {
            push(cmd(LF), BOLD_ON, encode(settings.receipt_header), BOLD_OFF, cmd(LF));
        }

        push(ALIGN_LEFT);
        push(encode(divider('=', PAPER_WIDTH)), cmd(LF));

        // ── Order meta (order type / payment type / date / beeper) ─────────
        // No cashier name and no branch line — kept lean like the receipt
        // preview in Profile settings.
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-PH', {
            month: '2-digit', day: '2-digit', year: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('en-PH', {
            hour: '2-digit', minute: '2-digit', hour12: false
        });

        if (settings.show_order_type) {
            const typeLabel = order.order_type === 'dine-in' ? 'Dine In' : 'Take Out';
            push(encode(padLine('Order Type:', typeLabel, PAPER_WIDTH)), cmd(LF));
        }
        const payMethod = order.payment_method === 'cash' ? 'Cash' : 'GCash';
        push(encode(padLine('Payment Type:', payMethod, PAPER_WIDTH)), cmd(LF));
        push(encode(padLine('Date:', `${dateStr}  ${timeStr}`, PAPER_WIDTH)), cmd(LF));

        if (settings.show_beeper && order.beeper_number) {
            push(BOLD_ON);
            push(encode(padLine('Beeper #:', String(order.beeper_number), PAPER_WIDTH)), cmd(LF));
            push(BOLD_OFF);
        }

        push(encode(divider('-', PAPER_WIDTH)), cmd(LF));

        // ── Items (Item / Qty / Price columns) ──────────────────────────────
        const COLS = [16, 6, 10]; // sums to PAPER_WIDTH (32)

        push(BOLD_ON);
        push(encode(padCols(['Item', 'Qty', 'Price'], COLS)), cmd(LF));
        push(BOLD_OFF);
        push(encode(divider('-', PAPER_WIDTH)), cmd(LF));

        for (const item of order.items) {
            const itemTotal = item.price * item.qty;
            const priceStr  = itemTotal.toLocaleString();
            if (item.name.length > COLS[0]) {
                push(encode(item.name.substring(0, PAPER_WIDTH)), cmd(LF));
                push(encode(padCols(['', String(item.qty), priceStr], COLS)), cmd(LF));
            } else {
                push(encode(padCols([item.name, String(item.qty), priceStr], COLS)), cmd(LF));
            }
        }

        push(encode(divider('-', PAPER_WIDTH)), cmd(LF));

        // ── Totals ────────────────────────────────────────────────────────
        push(encode(padLine('Subtotal', order.subtotal.toLocaleString(), PAPER_WIDTH)), cmd(LF));

        if (settings.show_discount && order.discount > 0) {
            push(encode(padLine('Discount', `-${order.discount.toLocaleString()}`, PAPER_WIDTH)), cmd(LF));
        }

        push(BOLD_ON, FONT_MED);
        push(encode(padLine('TOTAL', order.total.toFixed(0), PAPER_WIDTH)), cmd(LF));
        push(FONT_NORMAL, BOLD_OFF);

        if (order.payment_method === 'cash' && order.change_amount > 0) {
            push(encode(padLine('Cash Paid:', `Php ${parseFloat(order.amount_paid).toLocaleString()}`, PAPER_WIDTH)), cmd(LF));
            push(encode(padLine('Change:', `Php ${parseFloat(order.change_amount).toFixed(2)}`, PAPER_WIDTH)), cmd(LF));
        }
        if (order.payment_method === 'gcash' && order.gcash_reference) {
            push(encode(padLine('GCash Ref:', order.gcash_reference, PAPER_WIDTH)), cmd(LF));
        }

        push(encode(divider('-', PAPER_WIDTH)), cmd(LF));

        // ── Footer ────────────────────────────────────────────────────────
        push(ALIGN_CTR, BOLD_ON);
        push(encode('THANK YOU !!!'), cmd(LF));
        push(BOLD_OFF);
        if (settings.receipt_footer) {
            push(encode(settings.receipt_footer), cmd(LF));
        }
        push(cmd(LF));

        // ── QR code linking to the Facebook page ────────────────────────────
        if (settings.fb_page_url) {
            push(qrCode(settings.fb_page_url));
            push(cmd(LF));
            push(encode(`facebook page: ${settings.store_name || 'Twist & Roll'}`), cmd(LF));
        }
        push(cmd(LF));

        // ── Feed & cut ────────────────────────────────────────────────────
        push(FEED3);
        push(CUT);

        return mergeBytes(parts);
    }

    // ── Send data in chunks (BLE MTU is ~20 bytes, use 100 to be safe) ───
    async function sendChunked(characteristic, data, chunkSize) {
        chunkSize = chunkSize || 100;
        for (let i = 0; i < data.length; i += chunkSize) {
            await characteristic.writeValue(data.slice(i, i + chunkSize));
            // Small delay to avoid buffer overflow on slower printers
            await new Promise(r => setTimeout(r, 30));
        }
    }

    // ── Connect to printer ────────────────────────────────────────────────
    async function connect() {
        if (!navigator.bluetooth) {
            throw new Error(
                'Web Bluetooth is not supported in this browser.\n' +
                'Please use Chrome or Edge on Android/Windows.'
            );
        }

        // Request any Bluetooth device that advertises one of our services
        _device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: CANDIDATE_SERVICES,
        });

        _device.addEventListener('gattserverdisconnected', () => {
            _connected = false;
            _char      = null;
            _server    = null;
            console.log('[Printer] Disconnected');
        });

        _server = await _device.gatt.connect();
        console.log('[Printer] GATT connected to', _device.name);

        // Try each service until we find one with a writable characteristic
        for (const svcUUID of CANDIDATE_SERVICES) {
            let service;
            try {
                service = await _server.getPrimaryService(svcUUID);
            } catch {
                continue;
            }

            for (const charUUID of CANDIDATE_CHARS) {
                try {
                    const c = await service.getCharacteristic(charUUID);
                    if (c.properties.write || c.properties.writeWithoutResponse) {
                        _char      = c;
                        _connected = true;
                        console.log('[Printer] Ready —', svcUUID, '/', charUUID);
                        return true;
                    }
                } catch {
                    continue;
                }
            }
        }

        // Fallback: enumerate all characteristics
        try {
            const services = await _server.getPrimaryServices();
            for (const svc of services) {
                const chars = await svc.getCharacteristics();
                for (const c of chars) {
                    if (c.properties.write || c.properties.writeWithoutResponse) {
                        _char      = c;
                        _connected = true;
                        console.log('[Printer] Fallback char found:', c.uuid);
                        return true;
                    }
                }
            }
        } catch (e) {
            console.warn('[Printer] Fallback enumeration failed:', e);
        }

        throw new Error(
            'Connected to "' + _device.name + '" but could not find a writable characteristic.\n' +
            'Make sure the printer is on and in range.'
        );
    }

    // ── Public: ensure we have a live connection ──────────────────────────
    async function ensureConnected() {
        if (_connected && _char && _device?.gatt?.connected) return;
        await connect();
    }

    // ── Public: print a receipt ───────────────────────────────────────────
    async function print(order, settings) {
        await ensureConnected();
        const bytes = buildReceipt(order, settings);
        await sendChunked(_char, bytes);
        console.log('[Printer] Print job sent —', bytes.length, 'bytes');
    }

    // ── Public: disconnect ────────────────────────────────────────────────
    function disconnect() {
        if (_device?.gatt?.connected) {
            _device.gatt.disconnect();
        }
        _connected = false;
        _char = null;
    }

    // ── Public: is connected? ─────────────────────────────────────────────
    function isConnected() {
        return _connected && !!_char && !!_device?.gatt?.connected;
    }

    return { print, disconnect, isConnected, connect: ensureConnected };

})();