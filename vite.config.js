const isCodeSandbox = 'SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env

export default {
    root: './',
    publicDir: './static/',
    server: {
        host: true,
        open: true
    },
    build: {
        outDir: './dist',
        emptyOutDir: true,
        sourcemap: true
    }
}