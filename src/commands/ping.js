const { EmbedBuilder } = require('discord.js');
const settings = require('../settings/settings');

module.exports = {
    name: 'ping',
    description: 'Shows bot latency and API response time',
    aliases: ['latency', 'ms'],
    cooldown: 5000,
    developerOnly: true,

    async execute(message, args, client) {
        if (!settings.developers.includes(message.author.id)) {
            return message.reply({
                content: `${settings.emojis.error} Only bot developers can use this command!`,
                ephemeral: true
            });
        }

        const initialEmbed = createEmbed({
            color: settings.colors.main,
            author: { name: 'Measuring ping...', iconURL: client.user.displayAvatarURL() },
            footer: { text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) }
        });

        const pingMessage = await message.reply({ embeds: [initialEmbed] });

        const metrics = calculateMetrics(client, message, pingMessage);
        const { status, color } = determineStatus(metrics.wsLatency);
        const systemInfo = getSystemInfo(client);

        const finalEmbed = createEmbed({
            color: color,
            author: { name: 'Ping Results', iconURL: client.user.displayAvatarURL() },
            fields: [
                createField('📡 WebSocket Latency', `${metrics.wsLatency}ms`),
                createField('🤖 Bot Latency', `${metrics.msgLatency}ms`),
                createField('📊 Status', status),
                createField('💾 Memory Usage', `${systemInfo.memory} MB`),
                createField('⏰ Uptime', systemInfo.uptime),
                createField('🔧 API Version', `v${systemInfo.apiVersion}`)
            ],
            footer: { text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) },
            timestamp: true
        });

        await pingMessage.edit({ embeds: [finalEmbed] }).catch(() => {
            message.channel.send(`${settings.emojis.error} Failed to update ping message.`);
        });
    }
};

function createEmbed({ color, author, fields = [], footer, timestamp = false }) {
    const embed = new EmbedBuilder().setColor(color);
    
    if (author) embed.setAuthor(author);
    if (fields.length) embed.addFields(fields);
    if (footer) embed.setFooter(footer);
    if (timestamp) embed.setTimestamp();

    return embed;
}

function createField(name, value, inline = true) {
    return { name, value: `\`\`\`${value}\`\`\``, inline };
}

function calculateMetrics(client, message, pingMessage) {
    return {
        wsLatency: client.ws.ping,
        msgLatency: pingMessage.createdTimestamp - message.createdTimestamp
    };
}

function determineStatus(wsLatency) {
    if (wsLatency < 100) return { status: '🟢 Excellent', color: '#57F287' };
    if (wsLatency < 200) return { status: '🟡 Good', color: '#FEE75C' };
    return { status: '🔴 Poor', color: '#ED4245' };
}

function getSystemInfo(client) {
    return {
        memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
        uptime: formatUptime(client.uptime),
        apiVersion: require('discord.js').version
    };
}

function formatUptime(ms) {
    const times = {
        d: Math.floor(ms / 86400000),
        h: Math.floor(ms / 3600000) % 24,
        m: Math.floor(ms / 60000) % 60,
        s: Math.floor(ms / 1000) % 60
    };

    return Object.entries(times)
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => `${v}${k}`)
        .join(' ') || '0s';
}