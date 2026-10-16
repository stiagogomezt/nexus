import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NEXUS Finance — Sistema Operativo Financiero Personal',
  description:
    'Tu centro de control financiero. Ingresos, gastos, metas, deudas, inversiones, crypto y apuestas en un solo sistema inteligente.',
  keywords: ['finanzas personales', 'presupuesto', 'patrimonio', 'inversiones', 'crypto'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="color-scheme" content="light" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // NEXUS Finance — Extension Collision Guard
              // Prevents third-party browser extensions (multi-wallet EVM injectors like MetaMask, Phantom, evmMask.js)
              // from crashing the application or triggering Next.js dev overlay with "Cannot redefine property: ethereum"
              (function() {
                try {
                  // 1. Intercept window error events in capturing phase before Next.js error overlay
                  window.addEventListener('error', function(event) {
                    var msg = event && (event.message || (event.error && event.error.message) || '');
                    var filename = (event && event.filename) || '';
                    if (
                      msg.indexOf('Cannot redefine property: ethereum') !== -1 ||
                      filename.indexOf('chrome-extension://') !== -1 ||
                      filename.indexOf('moz-extension://') !== -1 ||
                      (msg.indexOf('ethereum') !== -1 && msg.indexOf('redefine') !== -1)
                    ) {
                      event.preventDefault();
                      event.stopImmediatePropagation();
                      return true;
                    }
                  }, true);

                  // 2. Intercept unhandledrejection
                  window.addEventListener('unhandledrejection', function(event) {
                    var reason = event && (event.reason && (event.reason.message || event.reason));
                    if (reason && typeof reason === 'string' && reason.indexOf('Cannot redefine property: ethereum') !== -1) {
                      event.preventDefault();
                      event.stopImmediatePropagation();
                    }
                  }, true);

                  // 3. Suppress console.error if Next.js dev overlay listens to console.error
                  var originalConsoleError = console.error;
                  console.error = function() {
                    var firstArg = arguments && arguments[0];
                    var str = typeof firstArg === 'string' ? firstArg : (firstArg && (firstArg.message || firstArg.stack)) || '';
                    if (
                      str.indexOf('Cannot redefine property: ethereum') !== -1 ||
                      str.indexOf('evmAsk.js') !== -1 ||
                      str.indexOf('evmMask.js') !== -1 ||
                      str.indexOf('bfnaelmomeimhlpmgjnjophhpkkoljpa') !== -1
                    ) {
                      return;
                    }
                    return originalConsoleError.apply(console, arguments);
                  };

                  // 4. Patch Object.defineProperty for window.ethereum to make it always configurable
                  var originalDefineProperty = Object.defineProperty;
                  Object.defineProperty = function(obj, prop, descriptor) {
                    if (
                      prop === 'ethereum' &&
                      (obj === window || obj === globalThis || obj === self || (typeof window !== 'undefined' && obj === window))
                    ) {
                      try {
                        var safeDescriptor = Object.assign({}, descriptor, { configurable: true });
                        return originalDefineProperty.call(Object, obj, prop, safeDescriptor);
                      } catch (e) {
                        return obj;
                      }
                    }
                    return originalDefineProperty.apply(Object, arguments);
                  };
                } catch (e) {
                  // Non-blocking fallback
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
