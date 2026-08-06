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
    const FEED2       = cmd(LF, LF);

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
        // Module size 7 — smaller than before (8), but not back down to 6,
        // since 6 was the size originally reported as unscannable.
        const setSize      = cmd(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x07);
        const setEC        = cmd(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31); // EC level M
        const storeHeader  = cmd(GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30);
        const printCmd     = cmd(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);

        return mergeBytes([selectModel, setSize, setEC, storeHeader, data, printCmd]);
    }

    // ── Logo: load a PNG, convert to a 1-bit monochrome bitmap, and build
    //    the ESC/POS raster image command (GS v 0) to print it ─────────────
    function loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload  = () => resolve(img);
            img.onerror = () => reject(new Error('logo image failed to load'));
            img.src = url;
        });
    }

    // Convert a loaded image into an ESC/POS raster bit image command.
    // maxWidthPx should be a multiple of 8 (raster rows are byte-packed).
    function imageToRasterCmd(img, maxWidthPx) {
        let w = img.naturalWidth  || img.width;
        let h = img.naturalHeight || img.height;
        if (!w || !h) return new Uint8Array(0);

        // Scale down to fit maxWidthPx, preserving aspect ratio
        if (w > maxWidthPx) {
            h = Math.round(h * (maxWidthPx / w));
            w = maxWidthPx;
        }
        // Raster width must be a multiple of 8 (one byte per 8 pixels)
        w = w - (w % 8);
        if (w <= 0 || h <= 0) return new Uint8Array(0);

        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        const { data } = ctx.getImageData(0, 0, w, h);
        const bytesPerRow = w / 8;
        const bitmap = new Uint8Array(bytesPerRow * h);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                // Treat transparent pixels as white (unprinted), otherwise threshold on luminance
                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                const isBlack = a > 40 && luminance < 150;
                if (isBlack) {
                    bitmap[y * bytesPerRow + (x >> 3)] |= (0x80 >> (x % 8));
                }
            }
        }

        const xL = bytesPerRow & 0xFF, xH = (bytesPerRow >> 8) & 0xFF;
        const yL = h & 0xFF,           yH = (h >> 8) & 0xFF;
        const header = cmd(GS, 0x76, 0x30, 0x00, xL, xH, yL, yH);

        return mergeBytes([header, bitmap]);
    }

    // Fetch + rasterize the store logo. Returns an empty array (prints nothing,
    // never throws) if the logo can't be loaded — a missing logo should never
    // block the rest of the receipt from printing.
    async function logoRasterBytes(logoUrl) {
        if (!logoUrl) return new Uint8Array(0);
        try {
            const img = await loadImage(logoUrl);
            return imageToRasterCmd(img, 260); // smaller footprint on paper — was 320px
        } catch (e) {
            console.warn('[Printer] Logo not printed:', e.message);
            return new Uint8Array(0);
        }
    }

    // ── Build receipt bytes ───────────────────────────────────────────────
    async function buildReceipt(order, settings) {
        const parts = [];

        const push = (...arrays) => parts.push(...arrays);

        push(INIT);

        // ── Header ────────────────────────────────────────────────────────
        push(ALIGN_CTR);
        const logoUrl = settings.logo_path
            ? (typeof BASE_URL !== 'undefined' ? BASE_URL : '') + settings.logo_path
            : null;
        const logoBytes = await logoRasterBytes(logoUrl);
        if (logoBytes.length > 0) {
            push(logoBytes, cmd(LF));
        } else {
            // No logo loaded — fall back to the store name as bold text, same as before
            push(BOLD_ON);
            push(encode(settings.store_name || 'Twist & Roll'), cmd(LF));
            push(BOLD_OFF);
        }
        push(encode((settings.store_name || 'Twist & Roll').toUpperCase()), cmd(LF));

        if (settings.store_address) {
            push(encode(settings.store_address), cmd(LF));
        }
        if (settings.receipt_header) {
            push(BOLD_ON, encode(settings.receipt_header), BOLD_OFF, cmd(LF));
        }

        push(ALIGN_LEFT);
        push(encode(divider('=', PAPER_WIDTH)), cmd(LF));

        // ── Order meta (order type / payment type / date / beeper) ─────────
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-PH', {
            month: '2-digit', day: '2-digit', year: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('en-PH', {
            hour: '2-digit', minute: '2-digit', hour12: false
        });

        if (settings.show_cashier && settings.cashier_name) {
            push(encode(padLine('Cashier:', settings.cashier_name, PAPER_WIDTH)), cmd(LF));
        }
        if (settings.show_order_type) {
            const typeLabel = order.order_type === 'dine-in' ? 'Dine In' : 'Take Out';
            push(encode(padLine('Order Type:', typeLabel, PAPER_WIDTH)), cmd(LF));
        }
        const payMethod = order.payment_method === 'cash' ? 'Cash' : 'GCash';
        if (settings.show_payment_type) {
            push(encode(padLine('Payment Type:', payMethod, PAPER_WIDTH)), cmd(LF));
        }
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

        push(encode(padLine('TOTAL', order.total.toFixed(0), PAPER_WIDTH)), cmd(LF));

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

        // ── QR code linking to the Facebook page ────────────────────────────
        if (settings.fb_page_url) {
            push(qrCode(settings.fb_page_url));
            push(cmd(LF));
            push(encode(`facebook page: ${settings.store_name || 'Twist & Roll'}`), cmd(LF));
        }

        // ── Feed & cut ────────────────────────────────────────────────────
        push(FEED2);
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

    // ── Public: forget the remembered printer (next connect() shows the full chooser again) ──
    function forgetDevice() {
        localStorage.removeItem('twistroll_printer_id');
        _device = null;
    }

    // ── Connect to printer ────────────────────────────────────────────────
    async function connect() {
        if (!navigator.bluetooth) {
            throw new Error(
                'Web Bluetooth is not supported in this browser.\n' +
                'Please use Chrome or Edge on Android/Windows.'
            );
        }

        const rememberedId = localStorage.getItem('twistroll_printer_id');

        // Try to silently reuse a previously-picked device first — Chrome remembers
        // Bluetooth permissions per-site, so once the user has picked their printer
        // once, they shouldn't need to pick it out of a list of every nearby
        // Bluetooth device again.
        _device = null;
        if (rememberedId && navigator.bluetooth.getDevices) {
            try {
                const known = await navigator.bluetooth.getDevices();
                _device = known.find(d => d.id === rememberedId) || null;
            } catch {
                _device = null;
            }
        }

        // No remembered device (or it's no longer available) — show the picker
        if (!_device) {
            _device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: CANDIDATE_SERVICES,
            });
            localStorage.setItem('twistroll_printer_id', _device.id);
        }

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
        const bytes = await buildReceipt(order, settings);
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

    return { print, disconnect, isConnected, connect: ensureConnected, forgetDevice };

})();