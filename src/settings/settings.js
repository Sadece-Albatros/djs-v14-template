class BotConfig {
    static get bot() {
        return {
            token: "", // Bot Token
            prefix: "", // Bot Prefix
            status: "discord.gg/", // Bot Status
        };
    }

    static get database() {
        return {
            mongoURL: "" // MongoDB Connection URL
        };
    }

    static get developers() {
        return [
            "" // Developer ID
        ];
    }

    static get emojis() {
        return {
            success: "✅",
            error: "❌",
            loading: "⏳"
        };
    }

    static get colors() {
        return {
            main: "#2f3136",
            success: "#57F287",
            error: "#ED4245",
            warning: "#FEE75C"
        };
    }

    static get messages() {
        return {
            error: "An error occurred!",
            cooldown: "Please wait before using this command again!",
            noPermission: "You don't have permission to use this command!"
        };
    }
}

module.exports = BotConfig;