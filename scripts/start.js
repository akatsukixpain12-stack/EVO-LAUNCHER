const { mkdirSync } = require('fs')
const { join } = require('path')
const { spawn } = require('child_process')

const electronBinary = require('electron')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const runtimeRoot = join(__dirname, '..', '.runtime')
const appDataDir = join(runtimeRoot, 'appdata')
const localAppDataDir = join(runtimeRoot, 'localappdata')

mkdirSync(appDataDir, { recursive: true })
mkdirSync(localAppDataDir, { recursive: true })

env.APPDATA = appDataDir
env.LOCALAPPDATA = localAppDataDir

const child = spawn(electronBinary, ['--disable-gpu', '.'], {
    stdio: 'inherit',
    env
})

child.on('exit', (code, signal) => {
    if(signal){
        process.kill(process.pid, signal)
        return
    }

    process.exit(code ?? 0)
})
