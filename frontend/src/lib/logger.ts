/**
 * Custom Premium Styled Logger for React Frontend
 * Outputs beautiful, color-coded console logs for high visibility
 */

const isDev = import.meta.env.MODE === 'development';

const STYLES = {
  info: 'background: #0284c7; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
  success: 'background: #059669; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
  warn: 'background: #d97706; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
  error: 'background: #dc2626; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
  timestamp: 'color: #6b7280; font-size: 10px;',
};

function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().split('T')[1].slice(0, -1);
}

export const logger = {
  info(message: string, ...args: any[]) {
    if (!isDev) return;
    console.log(
      `%c[${getTimestamp()}] %cINFO%c ${message}`,
      STYLES.timestamp,
      STYLES.info,
      '',
      ...args
    );
  },

  success(message: string, ...args: any[]) {
    if (!isDev) return;
    console.log(
      `%c[${getTimestamp()}] %cSUCCESS%c ${message}`,
      STYLES.timestamp,
      STYLES.success,
      '',
      ...args
    );
  },

  warn(message: string, ...args: any[]) {
    if (!isDev) return;
    console.warn(
      `%c[${getTimestamp()}] %cWARN%c ${message}`,
      STYLES.timestamp,
      STYLES.warn,
      '',
      ...args
    );
  },

  error(message: string, ...args: any[]) {
    // Errors are logged even in production (but without styles to be safe, or with styles if supported)
    console.error(
      `%c[${getTimestamp()}] %cERROR%c ${message}`,
      STYLES.timestamp,
      STYLES.error,
      '',
      ...args
    );
  },
};

export default logger;
