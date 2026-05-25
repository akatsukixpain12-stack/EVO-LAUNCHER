const remoteMain = require('@electron/remote/main')
remoteMain.initialize()

// Requirements
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron')
const autoUpdater = require('electron-updater').autoUpdater
const ejse = require('ejs-electron')
const fs = require('fs')
const isDev = require('./app/assets/js/isdev')
const path = require('path')
const crypto = require('crypto')

const { pathToFileURL } = require('url')

const {
    AZURE_CLIENT_ID,
    MSFT_OPCODE,
    MSFT_REPLY_TYPE,
    SHELL_OPCODE
} = require('./app/assets/js/ipcconstants')

const LangLoader = require('./app/assets/js/langloader')

// Setup Lang
LangLoader.setupLanguage()

// ==================== AUTO UPDATER ====================

function initAutoUpdater(event, data) {

    if(data){
        autoUpdater.allowPrerelease = true
    }

    if(isDev){
        autoUpdater.autoInstallOnAppQuit = false
        autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml')
    }

    if(process.platform === 'darwin'){
        autoUpdater.autoDownload = false
    }

    autoUpdater.on('update-available', (info) => {
        event.sender.send('autoUpdateNotification', 'update-available', info)
    })

    autoUpdater.on('update-downloaded', (info) => {
        event.sender.send('autoUpdateNotification', 'update-downloaded', info)
    })

    autoUpdater.on('update-not-available', (info) => {
        event.sender.send('autoUpdateNotification', 'update-not-available', info)
    })

    autoUpdater.on('checking-for-update', () => {
        event.sender.send('autoUpdateNotification', 'checking-for-update')
    })

    autoUpdater.on('error', (err) => {
        event.sender.send('autoUpdateNotification', 'realerror', err)
    })
}

ipcMain.on('autoUpdateAction', (event, arg, data) => {

    switch(arg){

        case 'initAutoUpdater':

            initAutoUpdater(event, data)
            event.sender.send('autoUpdateNotification', 'ready')

            break

        case 'checkForUpdate':

            autoUpdater.checkForUpdates()
                .catch(err => {
                    event.sender.send('autoUpdateNotification', 'realerror', err)
                })

            break

        case 'installUpdateNow':

            autoUpdater.quitAndInstall()

            break
    }
})

// ==================== ELY.BY LOGIN ====================

async function postJson(url, json) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(json)
    })

    const isJson = response.headers.get('content-type')?.includes('application/json')
    const data = isJson ? await response.json() : await response.text()

    if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : JSON.stringify(data))
    }

    return data
}

ipcMain.handle('elyby-login', async (event, username, password) => {

    try {

        const data = await postJson(
            'https://authserver.ely.by/auth/authenticate',
            {
                username: username,
                password: password,
                clientToken: crypto.randomUUID(),
                requestUser: true
            }
        )

        return {
            success: true,
            username: data.selectedProfile.name,
            uuid: data.selectedProfile.id,
            accessToken: data.accessToken
        }

    } catch(err) {

        return {
            success: false,
            error: err.message
        }

    }

})

ipcMain.handle('elyby-refresh', async (event, accessToken, clientToken) => {

    try {

        const data = await postJson(
            'https://authserver.ely.by/auth/refresh',
            {
                accessToken,
                clientToken,
                requestUser: true
            }
        )

        return {
            success: true,
            username: data.selectedProfile?.name,
            uuid: data.selectedProfile?.id,
            accessToken: data.accessToken
        }

    } catch(err) {

        return {
            success: false,
            error: err.message
        }

    }

})

ipcMain.handle('elyby-invalidate', async (event, accessToken, clientToken) => {

    try {

        await postJson(
            'https://authserver.ely.by/auth/invalidate',
            {
                accessToken,
                clientToken
            }
        )

        return {
            success: true
        }

    } catch(err) {

        return {
            success: false,
            error: err.message
        }

    }

})

// ==================== MICROSOFT LOGIN ====================

const REDIRECT_URI_PREFIX = 'https://login.microsoftonline.com/common/oauth2/nativeclient?'

let msftAuthWindow

ipcMain.on(MSFT_OPCODE.OPEN_LOGIN, (ipcEvent) => {

    if(msftAuthWindow){
        return
    }

    msftAuthWindow = new BrowserWindow({
        title: 'Microsoft Login',
        width: 520,
        height: 600,
        frame: true
    })

    msftAuthWindow.webContents.on('did-navigate', (_, uri) => {

        if(uri.startsWith(REDIRECT_URI_PREFIX)){

            let queryMap = {}

            new URL(uri).searchParams.forEach((v, k) => {
                queryMap[k] = v
            })

            ipcEvent.reply(
                MSFT_OPCODE.REPLY_LOGIN,
                MSFT_REPLY_TYPE.SUCCESS,
                queryMap
            )

            msftAuthWindow.close()
            msftAuthWindow = null
        }

    })

    msftAuthWindow.on('closed', () => {
        msftAuthWindow = null
    })

    msftAuthWindow.loadURL(
        `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?prompt=select_account&client_id=${AZURE_CLIENT_ID}&response_type=code&scope=XboxLive.signin%20offline_access&redirect_uri=https://login.microsoftonline.com/common/oauth2/nativeclient`
    )
})

// ==================== SHELL ====================

ipcMain.handle(SHELL_OPCODE.TRASH_ITEM, async (event, ...args) => {

    try {

        await shell.trashItem(args[0])

        return {
            result: true
        }

    } catch(error) {

        return {
            result: false,
            error: error
        }

    }

})

// ==================== WINDOW ====================

app.disableHardwareAcceleration()

let win

function createWindow() {

    win = new BrowserWindow({

        width: 980,
        height: 552,
        minWidth: 400, // Better for small/mobile-style windows
        minHeight: 300,
        frame: false,

        webPreferences: {
            preload: path.join(__dirname, 'app', 'assets', 'js', 'preloader.js'),
            nodeIntegration: true,
            contextIsolation: false
        },

        backgroundColor: '#171614'
    })

    remoteMain.enable(win.webContents)

    const data = {

        bkid: Math.floor(
            (Math.random() *
            fs.readdirSync(
                path.join(__dirname, 'app', 'assets', 'images', 'backgrounds')
            ).length)
        ),

        lang: (str, placeHolders) =>
            LangLoader.queryEJS(str, placeHolders)

    }

    Object.entries(data).forEach(([key, val]) => ejse.data(key, val))

    win.loadURL(
        pathToFileURL(
            path.join(__dirname, 'app', 'app.ejs')
        ).toString()
    )

    win.removeMenu()

    win.resizable = true

    win.on('closed', () => {
        win = null
    })
}

// ==================== MENU ====================

function createMenu() {

    if(process.platform === 'darwin') {

        let menuTemplate = [

            {
                label: 'Application',

                submenu: [

                    {
                        label: 'Quit',

                        accelerator: 'Command+Q',

                        click: () => {
                            app.quit()
                        }
                    }

                ]
            }

        ]

        let menuObject = Menu.buildFromTemplate(menuTemplate)

        Menu.setApplicationMenu(menuObject)
    }
}

// ==================== APP ====================

app.on('ready', createWindow)
app.on('ready', createMenu)

app.on('window-all-closed', () => {

    if(process.platform !== 'darwin'){
        app.quit()
    }

})

app.on('activate', () => {

    if(win === null){
        createWindow()
    }

})
