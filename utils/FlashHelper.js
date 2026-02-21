/**
 * FlashHelper for Kuppa.js
 * Standalone Styling - No Tailwind dependency
 * Optimized by Ketut Dana - Flat Design & Auto-hide
 */
const hbs = require('hbs');

class FlashHelper {
    /**
     * Register the flash helper to Handlebars
     * Using hbs instance to ensure compatibility with Express
     */
    static register() {
        hbs.registerHelper('flash', function(message, type = 'error') {
            // Early return if no message is provided
            if (!message) return '';

            // Generate unique ID for auto-hide logic
            const id = 'flash-' + Math.random().toString(36).substr(2, 9);
            const isError = type === 'error';
            
            // Design Tokens for Flat Standalone CSS (No Shadows)
            const theme = {
                bg: isError ? '#fef2f2' : '#ecfdf5',
                border: isError ? '#fee2e2' : '#d1fae5',
                text: isError ? '#b91c1c' : '#047857',
                title: isError ? '#7f1d1d' : '#064e3b',
                iconBg: isError ? '#fee2e2' : '#d1fae5',
                iconColor: isError ? '#dc2626' : '#10b981',
                label: isError ? 'There was a problem' : 'Success'
            };

            // SVG Icons based on type parameter
            const icon = isError 
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="${theme.iconColor}"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="${theme.iconColor}"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>`;

            // Component Template with Flat Styles and Transition Logic
            const html = `
                <div id="${id}" class="kuppa-flash-container" style="width: 100%; max-width: 448px; margin-bottom: 24px; transition: all 0.5s ease-in-out; animation: kuppaFadeInDown 0.5s ease-out;">
                    <div style="background-color: ${theme.bg}; border: 1px solid ${theme.border}; border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 16px; font-family: sans-serif;">
                        <div style="flex-shrink: 0; width: 40px; height: 40px; background-color: ${theme.iconBg}; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            ${icon}
                        </div>
                        <div style="flex-grow: 1;">
                            <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: ${theme.title}; line-height: 1.25;">${theme.label}</h3>
                            <p style="margin: 4px 0 0 0; font-size: 12px; color: ${theme.text}; line-height: 1.5;">${message}</p>
                        </div>
                    </div>
                    <style>
                        @keyframes kuppaFadeInDown {
                            from { opacity: 0; transform: translateY(-16px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    </style>
                    <script>
                        setTimeout(() => {
                            const el = document.getElementById('${id}');
                            if (el) {
                                el.style.opacity = '0';
                                el.style.transform = 'translateY(-10px)';
                                setTimeout(() => el.remove(), 500);
                            }
                        }, 5000);
                    </script>
                </div>
            `;

            return new hbs.handlebars.SafeString(html);
        });
    }
}

module.exports = FlashHelper;