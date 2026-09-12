const { REST, Routes } = require('discord.js');
const path = require('path');
const config = require('./config');
const { getCommandFiles } = require('./commandLoader');

const clientId = process.env.bot_client_id;
if (!clientId) {
  console.error('$LumiyaBot: bot_client_id not set in .env - skipping slash command registration.');
  process.exit(0);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = getCommandFiles(commandsPath);

for (const file of commandFiles) {
  const command = require(file);
  if (command.data) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log(`$LumiyaBot: Registering ${commands.length} slash commands...`);
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log(`$LumiyaBot: Successfully registered ${commands.length} slash commands.`);
  } catch (error) {
    console.error('$LumiyaBot: Error registering slash commands:', error);
  }
})();
