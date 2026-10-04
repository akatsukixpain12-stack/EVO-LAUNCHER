/**
 * EVO Distribution Integration
 *
 * The launcher already has a real Helios DistributionAPI. This module must
 * never invent Minecraft versions: the old implementation returned three
 * hardcoded placeholder entries and made the version/mod system misleading.
 */

const { LoggerUtil } = require('helios-core')
const { DistroAPI } = require('./distromanager')
const ConfigManager = require('./configmanager')
const { detectJavaInstallations, validateJava, getRecommendedJavaVersion } = require('./javamanager')

const logger = LoggerUtil.getLogger('DistroIntegration')

async function getDistribution() {
    return DistroAPI.getDistribution()
}

async function getAvailableVersions() {
    const distro = await getDistribution()
    return distro.servers.map(server => ({
        id: server.rawServer.id,
        name: server.rawServer.name,
        minecraftVersion: server.rawServer.minecraftVersion,
        type: server.modules.some(m => m.rawModule.type === 'Fabric') ? 'fabric'
            : server.modules.some(m => String(m.rawModule.type).includes('Forge')) ? 'forge'
            : 'vanilla',
        rawServer: server.rawServer,
        server
    }))
}

async function getJavaRecommendation(versionId) {
    const versions = await getAvailableVersions()
    const version = versions.find(v => v.id === versionId)
    if (!version) return null

    const recommendedMajor = getRecommendedJavaVersion(version.minecraftVersion)
    const installations = detectJavaInstallations()
    const best = installations.find(j => {
        const match = String(j.version).match(/^(?:1\.)?(\d+)/)
        return match && Number(match[1]) === recommendedMajor
    })

    return {
        minecraftVersion: version.minecraftVersion,
        recommended: `Java ${recommendedMajor}`,
        foundJava: best || null,
        alternatives: installations
    }
}

function setJavaForServer(serverId, javaPath) {
    try {
        const validation = validateJava(javaPath)
        if (!validation) {
            logger.error(`Invalid Java at ${javaPath}`)
            return false
        }

        ConfigManager.setJavaExecutable(serverId, javaPath)
        ConfigManager.save()
        return true
    } catch (e) {
        logger.error(`Failed to set Java: ${e.message}`)
        return false
    }
}

async function autoSetupJavaForAllServers() {
    const versions = await getAvailableVersions()
    const status = {}

    for (const version of versions) {
        const recommendation = await getJavaRecommendation(version.id)
        if (recommendation?.foundJava) {
            status[version.id] = {
                success: setJavaForServer(version.id, recommendation.foundJava.path),
                java: recommendation.foundJava.version
            }
        } else {
            status[version.id] = {
                success: false,
                message: 'No suitable Java found'
            }
        }
    }

    return status
}

module.exports = {
    getDistribution,
    getAvailableVersions,
    getJavaRecommendation,
    setJavaForServer,
    autoSetupJavaForAllServers
}
