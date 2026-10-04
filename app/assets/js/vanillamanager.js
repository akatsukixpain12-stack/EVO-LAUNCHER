/**
 * EVO real Minecraft instance manager.
 *
 * Uses official Mojang metadata for the complete version catalog and real
 * client/libraries/assets, then uses Fabric Meta for optional Fabric profiles.
 * No placeholder versions or fake download buttons.
 */

const fs = require('fs-extra')
const path = require('path')
const crypto = require('crypto')
const { Type } = require('helios-distribution-types')
const { isLibraryCompatible } = require('helios-core/common')
const ProcessBuilder = require('./processbuilder')
const ConfigManager = require('./configmanager')
const { detectJavaInstallations, getRecommendedJavaVersion, validateJava } = require('./javamanager')

const VERSION_MANIFEST_URLS = [
    'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json',
    'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json'
]
const FABRIC_META = 'https://meta.fabricmc.net/v2'
let manifestCache = null
let selectedProfile = null

function commonRoot() {
    return ConfigManager.getCommonDirectory()
}

function instanceRoot(id) {
    return path.join(ConfigManager.getInstanceDirectory(), id)
}

function safeId(version, loader) {
    const clean = String(version).replace(/[^a-zA-Z0-9._-]/g, '_')
    return `${loader}-${clean}`
}

async function fetchJson(url) {
    const response = await fetch(url, {
        headers: { 'User-Agent': 'EVO-Launcher/2.2.1' }
    })
    if(!response.ok) throw new Error(`HTTP ${response.status} while requesting ${url}`)
    return response.json()
}

async function getVersionManifest(force = false) {
    if(manifestCache && !force) return manifestCache

    let lastError = null
    for(const url of VERSION_MANIFEST_URLS) {
        try {
            manifestCache = await fetchJson(url)
            return manifestCache
        } catch(err) {
            lastError = err
        }
    }
    throw lastError || new Error('Unable to load Mojang version manifest.')
}

async function getVersion(versionId) {
    const manifest = await getVersionManifest()
    const entry = manifest.versions.find(v => v.id === versionId)
    if(!entry) throw new Error(`Minecraft version ${versionId} was not found in Mojang's manifest.`)
    return fetchJson(entry.url)
}

function sha1(buffer) {
    return crypto.createHash('sha1').update(buffer).digest('hex')
}

async function downloadVerified(url, destination, expectedSha1) {
    await fs.ensureDir(path.dirname(destination))

    if(expectedSha1 && await fs.pathExists(destination)) {
        try {
            const existing = await fs.readFile(destination)
            if(sha1(existing) === expectedSha1) return false
        } catch(_) {}
    }

    const response = await fetch(url, {
        headers: { 'User-Agent': 'EVO-Launcher/2.2.1' }
    })
    if(!response.ok) throw new Error(`HTTP ${response.status} downloading ${url}`)

    const buffer = Buffer.from(await response.arrayBuffer())
    if(expectedSha1 && sha1(buffer) !== expectedSha1) {
        throw new Error(`SHA-1 verification failed for ${path.basename(destination)}.`)
    }

    const temporary = destination + '.evo-download'
    await fs.writeFile(temporary, buffer)
    await fs.move(temporary, destination, { overwrite: true })
    return true
}

function libraryAllowed(lib) {
    try {
        return isLibraryCompatible(lib.rules, lib.natives)
    } catch(_) {
        return true
    }
}

function mavenPath(name) {
    const parts = String(name).split(':')
    if(parts.length < 3) throw new Error(`Invalid Maven library name: ${name}`)
    const group = parts[0].replace(/\./g, '/')
    const artifact = parts[1]
    const version = parts[2]
    const classifier = parts[3]
    return `${group}/${artifact}/${version}/${artifact}-${version}${classifier ? '-' + classifier : ''}.jar`
}

function resolveArtifact(lib) {
    if(lib.downloads?.artifact) return lib.downloads.artifact
    if(!lib.name) return null

    const artifactPath = mavenPath(lib.name)
    const base = lib.url || 'https://libraries.minecraft.net/'
    return {
        path: artifactPath,
        url: new URL(artifactPath, base.endsWith('/') ? base : base + '/').toString()
    }
}

function resolveClassifierArtifacts(lib) {
    if(!lib.downloads?.classifiers) return []
    return Object.values(lib.downloads.classifiers)
}

async function installLibraries(manifest, progress = () => {}) {
    const tasks = []

    for(const lib of (manifest.libraries || [])) {
        if(!libraryAllowed(lib)) continue

        const artifact = resolveArtifact(lib)
        if(artifact?.url && artifact?.path) {
            tasks.push(artifact)
        }

        for(const classifier of resolveClassifierArtifacts(lib)) {
            if(classifier?.url && classifier?.path) tasks.push(classifier)
        }
    }

    let completed = 0
    const queue = tasks.slice()

    const worker = async () => {
        while(queue.length) {
            const artifact = queue.pop()
            await downloadVerified(
                artifact.url,
                path.join(commonRoot(), 'libraries', artifact.path),
                artifact.sha1
            )
            completed++
            progress(completed, tasks.length)
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(8, Math.max(1, tasks.length)) }, worker)
    )
}

async function installAssets(manifest, progress = () => {}) {
    if(!manifest.assetIndex?.url || !manifest.assetIndex?.id) return

    const indexId = manifest.assetIndex.id
    const indexPath = path.join(commonRoot(), 'assets', 'indexes', `${indexId}.json`)
    await downloadVerified(manifest.assetIndex.url, indexPath, manifest.assetIndex.sha1)

    const index = await fs.readJson(indexPath)
    const objects = Object.values(index.objects || {})
    const queue = objects.slice()
    let completed = 0

    const worker = async () => {
        while(queue.length) {
            const object = queue.pop()
            if(!object?.hash) continue

            const prefix = object.hash.slice(0, 2)
            const destination = path.join(commonRoot(), 'assets', 'objects', prefix, object.hash)
            const url = `https://resources.download.minecraft.net/${prefix}/${object.hash}`

            await downloadVerified(url, destination, object.hash)
            completed++
            progress(completed, objects.length)
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(8, Math.max(1, objects.length)) }, worker)
    )
}

async function installLogging(manifest, versionDir) {
    const file = manifest.logging?.client?.file
    if(!file?.url || !file?.id) return null

    const destination = path.join(versionDir, file.id)
    await downloadVerified(file.url, destination, file.sha1)
    return destination
}

async function installVanilla(versionId, onProgress = () => {}) {
    const manifest = await getVersion(versionId)
    const client = manifest.downloads?.client
    if(!client?.url) throw new Error(`Minecraft ${versionId} has no client download.`)

    const versionDir = path.join(commonRoot(), 'versions', versionId)
    await fs.ensureDir(versionDir)

    onProgress({ message: `Downloading Minecraft ${versionId}…`, percent: 5 })
    await downloadVerified(
        client.url,
        path.join(versionDir, `${versionId}.jar`),
        client.sha1
    )

    await fs.writeJson(path.join(versionDir, `${versionId}.json`), manifest, { spaces: 2 })

    onProgress({ message: 'Installing Minecraft libraries…', percent: 20 })
    await installLibraries(manifest, (done, total) => {
        const percent = 20 + Math.round((done / Math.max(1, total)) * 35)
        onProgress({ message: `Installing libraries (${done}/${total})…`, percent })
    })

    const logPath = await installLogging(manifest, versionDir)
    if(logPath) {
        manifest.__evoLogPath = logPath
        await fs.writeJson(path.join(versionDir, `${versionId}.json`), manifest, { spaces: 2 })
    }

    onProgress({ message: 'Installing assets…', percent: 58 })
    await installAssets(manifest, (done, total) => {
        const percent = 58 + Math.round((done / Math.max(1, total)) * 40)
        onProgress({ message: `Installing assets (${done}/${total})…`, percent })
    })

    onProgress({ message: `Minecraft ${versionId} is ready.`, percent: 100 })
    return manifest
}

async function getFabricLoaders(versionId) {
    return fetchJson(`${FABRIC_META}/versions/loader/${encodeURIComponent(versionId)}`)
}

async function installVanillaProfile(versionId, onProgress = () => {}) {
    const manifest = await installVanilla(versionId)
    const id = safeId(versionId, 'vanilla')

    await fs.ensureDir(instanceRoot(id))
    ConfigManager.setSelectedVanillaVersion(id)
    ConfigManager.save()

    selectedProfile = {
        id,
        version: versionId,
        loader: 'vanilla',
        loaderVersion: null,
        manifest,
        modManifest: manifest
    }

    onProgress({ message: `Minecraft ${versionId} installed.`, percent: 100 })
    return selectedProfile
}

async function installFabric(versionId, loaderVersion = null, onProgress = () => {}) {
    const manifest = await installVanilla(versionId, onProgress)
    const loaders = await getFabricLoaders(versionId)

    const stable = loaders.filter(v => v.loader?.stable)
    const selected = loaderVersion
        ? loaders.find(v => v.loader?.version === loaderVersion)
        : (stable[0] || loaders[0])

    if(!selected?.loader?.version) {
        throw new Error(`Fabric does not support Minecraft ${versionId}.`)
    }

    const loader = selected.loader.version
    onProgress({ message: `Installing Fabric Loader ${loader}…`, percent: 70 })

    const profileUrl =
        `${FABRIC_META}/versions/loader/${encodeURIComponent(versionId)}/${encodeURIComponent(loader)}/profile/json`
    const profile = await fetchJson(profileUrl)
    const profileId = safeId(versionId, 'fabric')
    const versionDir = path.join(commonRoot(), 'versions', profileId)

    await fs.ensureDir(versionDir)
    await fs.writeJson(path.join(versionDir, `${profileId}.json`), profile, { spaces: 2 })

    const fabricManifest = {
        id: profileId,
        type: 'release',
        mainClass: profile.mainClass,
        arguments: profile.arguments || { jvm: [], game: [] },
        minecraftArguments: profile.minecraftArguments,
        libraries: profile.libraries || [],
        version: profileId
    }

    await installLibraries(fabricManifest, (done, total) => {
        const percent = 70 + Math.round((done / Math.max(1, total)) * 25)
        onProgress({ message: `Installing Fabric libraries (${done}/${total})…`, percent })
    })

    await fs.ensureDir(path.join(instanceRoot(profileId), 'mods'))
    await fs.ensureDir(path.join(instanceRoot(profileId), 'config'))

    ConfigManager.setSelectedVanillaVersion(profileId)
    ConfigManager.save()

    selectedProfile = {
        id: profileId,
        version: versionId,
        loader: 'fabric',
        loaderVersion: loader,
        manifest,
        modManifest: profile
    }

    onProgress({ message: `Fabric ${loader} for ${versionId} is ready.`, percent: 100 })
    return selectedProfile
}

function recommendedJava(version) {
    return getRecommendedJavaVersion(version) || 8
}

function findJava(profile) {
    const installations = detectJavaInstallations()
    const major = recommendedJava(profile.version)

    const exact = installations.find(j => {
        const match = String(j.version).match(/^(?:1\.)?(\d+)/)
        return match && Number(match[1]) === major
    })

    return exact || null
}

function createStandaloneServer(profile) {
    const javaMajor = recommendedJava(profile.version)

    return {
        rawServer: {
            id: profile.id,
            name: `${profile.loader === 'fabric' ? 'Fabric ' : 'Minecraft '}${profile.version}`,
            minecraftVersion: profile.version,
            autoconnect: false,
            javaOptions: {
                supported: `>=${javaMajor}`,
                suggestedMajor: javaMajor
            }
        },
        modules: profile.loader === 'fabric'
            ? [{ rawModule: { type: Type.Fabric }, subModules: [] }]
            : [],
        hostname: '',
        port: 25565,
        effectiveJavaOptions: {
            supported: `>=${javaMajor}`,
            suggestedMajor: javaMajor
        }
    }
}

async function launchProfile(profile) {
    if(!profile) throw new Error('No EVO instance is selected.')

    const authUser = ConfigManager.getSelectedAccount()
    if(!authUser) throw new Error('Select a Minecraft account before launching.')

    const java = findJava(profile)
    if(!java?.path) {
        throw new Error(
            `Java ${recommendedJava(profile.version)} was not found. Install that Java version in Settings before launching ${profile.version}.`
        )
    }

    if(!validateJava(java.path)) {
        throw new Error(`Invalid Java executable: ${java.path}`)
    }

    ConfigManager.setJavaExecutable(profile.id, java.path)
    ConfigManager.save()

    // Vanilla uses Mojang's manifest as the base manifest. Do not pass its
    // game arguments a second time as loader arguments.
    const modManifest = profile.loader === 'vanilla'
        ? {
            ...profile.manifest,
            id: profile.manifest.id,
            mainClass: profile.manifest.mainClass,
            minecraftArguments: profile.manifest.minecraftArguments,
            arguments: { jvm: [], game: [] }
        }
        : profile.modManifest

    const builder = new ProcessBuilder(
        createStandaloneServer(profile),
        profile.manifest,
        modManifest,
        authUser,
        '2.2.1'
    )

    return builder.build()
}

async function loadInstalledProfile(id) {
    const versionDir = path.join(commonRoot(), 'versions', id)
    const profilePath = path.join(versionDir, `${id}.json`)
    if(!(await fs.pathExists(profilePath))) {
        throw new Error(`Instance ${id} is not installed.`)
    }

    const profile = await fs.readJson(profilePath)
    const isFabric = id.startsWith('fabric-')
    const mcVersion = isFabric
        ? (profile.inheritsFrom || id.substring('fabric-'.length))
        : (profile.id || id.substring('vanilla-'.length))

    const localVanillaPath = path.join(commonRoot(), 'versions', mcVersion, `${mcVersion}.json`)
    const vanillaManifest = await fs.pathExists(localVanillaPath)
        ? fs.readJson(localVanillaPath)
        : getVersion(mcVersion)

    return {
        id,
        version: mcVersion,
        loader: isFabric ? 'fabric' : 'vanilla',
        loaderVersion: null,
        manifest: await vanillaManifest,
        modManifest: profile
    }
}


async function launchSelected() {
    const id = resolveSelectedProfile()
    if(!id) throw new Error('No standalone EVO instance is selected.')

    if(!selectedProfile || selectedProfile.id !== id) {
        selectedProfile = await loadInstalledProfile(id)
    }

    return launchProfile(selectedProfile)
}

function resolveSelectedProfile() {
    return ConfigManager.getSelectedVanillaVersion() || null
}

function updateLandingLabel(profile) {
    const button = document.getElementById('server_selection_button')
    const instanceName = document.getElementById('evoInstanceName')

    if(button) {
        button.innerHTML =
            `&#8226; ${profile.loader === 'fabric' ? 'Fabric ' : 'Minecraft '}${profile.version}`
    }

    if(instanceName) {
        instanceName.textContent =
            profile.loader === 'fabric'
                ? `FABRIC ${profile.version}`
                : `MINECRAFT ${profile.version}`
    }
}

function showManagerError(message) {
    console.error('[EVO Version Manager]', message)
    if(typeof window.setOverlayContent === 'function') {
        window.setOverlayContent('Version Manager', message, 'OK')
        window.setOverlayHandler(null)
        window.toggleOverlay(true)
    } else {
        alert(message)
    }
}

function renderVersionRows(versions, filter = '') {
    const list = document.getElementById('evoVersionList')
    if(!list) return

    const needle = filter.trim().toLowerCase()
    list.innerHTML = ''

    const filtered = versions.filter(v =>
        !needle ||
        v.id.toLowerCase().includes(needle) ||
        v.type.toLowerCase().includes(needle)
    )

    for(const version of filtered) {
        const installed = fs.existsSync(
            path.join(commonRoot(), 'versions', version.id, `${version.id}.jar`)
        )

        const row = document.createElement('div')
        row.className = 'evo-version-row'
        row.innerHTML = `
            <div class="evo-version-copy">
                <strong>${version.id}</strong>
                <span>${version.type} · ${version.releaseTime ? new Date(version.releaseTime).toLocaleDateString() : ''}</span>
            </div>
            <button class="evo-version-install" data-version="${version.id}">
                ${installed ? 'Reinstall' : 'Install'}
            </button>
        `
        list.appendChild(row)
    }
}

async function openVersionManager() {
    const modal = document.getElementById('evoVersionManager')
    if(!modal) return

    modal.style.display = 'flex'
    const list = document.getElementById('evoVersionList')
    if(list) list.innerHTML = '<div class="evo-version-loading">Loading Mojang versions…</div>'

    try {
        const manifest = await getVersionManifest()
        renderVersionRows(manifest.versions || [])
    } catch(err) {
        showManagerError(err.message)
    }
}

async function installFromUI(versionId, loader) {
    const modal = document.getElementById('evoVersionManager')
    const status = document.getElementById('evoVersionStatus')
    const buttons = document.querySelectorAll('.evo-version-install')
    buttons.forEach(button => { button.disabled = true })

    try {
        const profile = loader === 'fabric'
            ? await installFabric(versionId, null, p => {
                if(status) status.textContent = p.message
            })
            : await installVanillaProfile(versionId, p => {
                if(status) status.textContent = p.message
            })

        updateLandingLabel(profile)
        const launchButton = document.getElementById('launch_button')
        if(launchButton) launchButton.disabled = false
        if(status) {
            status.textContent =
                `${profile.loader === 'fabric' ? 'Fabric' : 'Minecraft'} ${profile.version} ready.`
        }

        setTimeout(() => {
            if(modal) modal.style.display = 'none'
        }, 500)
    } catch(err) {
        showManagerError(err.message)
    } finally {
        buttons.forEach(button => { button.disabled = false })
    }
}

async function restoreSelectedInstance(){
    const id = ConfigManager.getSelectedVanillaVersion()
    if(!id) return

    try {
        const profile = await loadInstalledProfile(id)
        selectedProfile = profile
        updateLandingLabel(profile)

        const launchButton = document.getElementById('launch_button')
        if(launchButton) launchButton.disabled = false
    } catch(err) {
        console.warn('[EVO Version Manager] Stored instance is unavailable:', err.message)
        ConfigManager.setSelectedVanillaVersion(null)
        ConfigManager.save()
    }
}

function bindVersionManager() {
    const modal = document.getElementById('evoVersionManager')
    if(!modal) return

    const close = document.getElementById('evoVersionClose')
    const search = document.getElementById('evoVersionSearch')
    const list = document.getElementById('evoVersionList')
    const quick = document.getElementById('evoQuickVersions')

    close.onclick = () => { modal.style.display = 'none' }

    search.oninput = async event => {
        const manifest = await getVersionManifest()
        renderVersionRows(manifest.versions || [], event.target.value)
    }

    list.onclick = async event => {
        const button = event.target.closest('.evo-version-install')
        if(!button) return

        const loader = document.getElementById('evoLoaderChoice')?.value || 'vanilla'
        await installFromUI(button.dataset.version, loader)
    }

    modal.addEventListener('click', event => {
        if(event.target === modal) modal.style.display = 'none'
    })

    if(quick) quick.onclick = openVersionManager
}

document.addEventListener('DOMContentLoaded', async () => {
    bindVersionManager()
    await restoreSelectedInstance()
})

window.EvoVanillaManager = {
    getVersionManifest,
    getVersion,
    installVanilla,
    installFabric,
    installVanillaProfile,
    loadInstalledProfile,
    launchProfile,
    launchSelected,
    updateLandingLabel,
    openVersionManager,
    resolveSelectedProfile
}
