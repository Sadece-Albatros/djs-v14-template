const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const { readdirSync } = require('fs');
const mongoose = require('mongoose');
const settings = require('./src/settings/settings');

class ConsoleColors {
    static get codes() {
        return {
            reset: '\x1b[0m',
            red: '\x1b[38;5;196m',
            green: '\x1b[38;5;82m',
            blue: '\x1b[38;5;45m',
            purple: '\x1b[38;5;171m',
            yellow: '\x1b[38;5;226m'
        };
    }

    static log(type, message) {
        const types = {
            success: this.codes.green,
            error: this.codes.red,
            warning: this.codes.yellow,
            info: this.codes.blue,
            database: this.codes.purple
        };

        console.log(`${types[type]}[${type.toUpperCase()}] ${message}${this.codes.reset}`);
    }
}

class DiscordBot {
    constructor() {
        this.client = new Client({
            intents: Object.values(GatewayIntentBits),
            presence: {
                activities: [{
                    name: settings.bot.status,
                    type: ActivityType.Competing
                }],
                status: 'dnd'
            }
        });

        this.commands = new Collection();
        this.aliases = new Collection();
        this.cooldowns = new Collection();

        this.initialize();
    }

    async initialize() {
        console.clear();
        await this.loadCommands();
        await this.connectDatabase();
        await this.loadEvents();
        await this.loginBot();
    }

    async loadCommands() {
        ConsoleColors.log('info', 'Loading commands...');
        
        readdirSync('./src/commands').forEach(file => {
            const command = require(`./src/commands/${file}`);
            this.commands.set(command.name, command);
            
            if (command.aliases) {
                command.aliases.forEach(alias => this.aliases.set(alias, command.name));
            }

            ConsoleColors.log('success', `Loaded command: ${command.name}`);
        });
    }

    async connectDatabase() {
        ConsoleColors.log('info', 'Connecting to MongoDB...');

        try {
            await mongoose.connect(settings.database.mongoURL, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            ConsoleColors.log('database', 'Successfully connected to MongoDB!');
        } catch (error) {
            ConsoleColors.log('error', `MongoDB connection failed: ${error.message}`);
        }
    }

    async loadEvents() {
        this.client.on('ready', () => {
            ConsoleColors.log('success', `Logged in as ${this.client.user.tag}`);
        });

        this.client.on('messageCreate', message => this.handleCommand(message));
    }

    async handleCommand(message) {
        if (!message.content.startsWith(settings.bot.prefix) || message.author.bot) return;

        const [commandName, ...args] = message.content
            .slice(settings.bot.prefix.length)
            .trim()
            .split(/ +/);

        const command = this.commands.get(commandName) || 
                       this.commands.get(this.aliases.get(commandName));

        if (!command) return;

        if (command.developerOnly && !settings.developers.includes(message.author.id)) {
            return message.reply(settings.messages.noPermission);
        }

        if (command.cooldown) {
            if (!this.cooldowns.has(command.name)) {
                this.cooldowns.set(command.name, new Collection());
            }

            const now = Date.now();
            const timestamps = this.cooldowns.get(command.name);
            const cooldownAmount = command.cooldown;

            if (timestamps.has(message.author.id)) {
                const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    return message.reply(
                        `${settings.emojis.error} ${settings.messages.cooldown} (${timeLeft.toFixed(1)}s)`
                    );
                }
            }

            timestamps.set(message.author.id, now);
            setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
        }

        try {
            await command.execute(message, args, this.client);
        } catch (error) {
            ConsoleColors.log('error', `Command execution failed: ${error.message}`);
            message.reply(settings.messages.error);
        }
    }

    async loginBot() {
        try {
            await this.client.login(settings.bot.token);
        } catch (error) {
            ConsoleColors.log('error', `Login failed: ${error.message}`);
            process.exit(1);
        }
    }
}

process.on('unhandledRejection', error => {
    ConsoleColors.log('error', `Unhandled promise rejection: ${error.message}`);
});

new DiscordBot();