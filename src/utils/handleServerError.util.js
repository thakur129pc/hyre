export const handleServerError = (serverType) => (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ ${serverType} Port is already in use.`);
  } else if (err.code === 'EACCES') {
    console.error(`❌ ${serverType} requires elevated privileges.`);
  } else {
    console.error(`❌ ${serverType} Server Error:`, err);
  }
  process.exit(1);
};
