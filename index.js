const { Client, GatewayIntentBits } = require('discord.js'); // Discord Js
const sqlite3 = require('sqlite3').verbose(); // Banco de dados
const config = require('./config.json'); // Config
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const db = new sqlite3.Database('./users.db');

const ongoingWorkMessages = new Map();

const TOKEN = 'TOKEN_DO_SEU_BOT';  //  seu token do bot
const IDSERVER = 'SEU_ID_DO_SERVIDOR' // Id do seu servidor

// Inicializar o banco de dados
db.run("CREATE TABLE IF NOT EXISTS work_start_times (user_id TEXT, start_time INTEGER)");

client.once('ready', async () => {
    console.log('\n Bot está online! 😎\n');

    const startWorkCommand = {
        name: 'iniciartrabalho',
        description: 'Começar registro de trabalho.'
    };
    const endWorkCommand = {
        name: 'finalizartrabalho',
        description: 'Finalizar registro de trabalho de informar o valor'
    };

    await client.guilds.cache.get(IDSERVER).commands.create(startWorkCommand);
    await client.guilds.cache.get(IDSERVER).commands.create(endWorkCommand);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, user } = interaction;

    if (commandName === 'iniciartrabalho') {
        db.get("SELECT start_time FROM work_start_times WHERE user_id = ?", [user.id], async (err, row) => {
            if (err) {
                throw err;
            }
            if (row) {
                interaction.reply('🤔** Você já começou a trabalhar! Use /finalizartrabalho para finalizar.**');
            } else {
                db.run("INSERT INTO work_start_times (user_id, start_time) VALUES (?, ?)", [user.id, Date.now()]);
                
                const ongoingMessage = await interaction.reply(`*Iniciando o contador...*`, { fetchReply: true });
                ongoingWorkMessages.set(user.id, ongoingMessage);
        
                const updateInterval = setInterval(async () => {
                    const startTime = Date.now();
                    const workDuration = startTime - ongoingMessage.createdTimestamp;
                    const workHours = workDuration / (1000 * 60 * 60);
                    const valorHora = config.valorHora;
                    const payment = valorHora * workHours;
        
                    const hours = Math.floor(workHours);
                    const minutes = Math.floor((workHours * 60) % 60);
                    const seconds = Math.floor((workHours * 3600) % 60);
        
                    ongoingMessage.edit(`\`\`\`Trabalhando há: \n${hours} horas, ${minutes} minutos e ${seconds} segundos. \nValor a pagar: R$${payment.toFixed(2)}\`\`\``);
                }, 10000);
        
                // Guardar o intervalo para limpar quando o trabalho for finalizado
                ongoingWorkMessages.set(user.id + "_interval", updateInterval);
            }
        });
    } else if (commandName === 'finalizartrabalho') {
        db.get("SELECT start_time FROM work_start_times WHERE user_id = ?", [user.id], async (err, row) => {
            if (err) {
                throw err;
            }
            if (row) {
              const startTime = row.start_time;
              const endTime = Date.now();
              
              // Definir duração do trabalho aqui
              const workDuration = endTime - startTime;
              
              const totalSeconds = Math.floor(workDuration / 1000);  // Convertendo milissegundos para segundos
              const hours = Math.floor(totalSeconds / 3600);
              const minutes = Math.floor((totalSeconds % 3600) / 60);
              const seconds = totalSeconds % 60;
              
              const valorHora = config.valorHora;
              const workHoursDecimal = workDuration / (1000 * 60 * 60);
              const payment = valorHora * workHoursDecimal;
              
              await interaction.reply(`**Relatório de trabalho**\n Trabalhamos **${hours}** horas, **${minutes}** minutos e **${seconds}** segundos.\n Valor a pagar é de **R$${payment.toFixed(2)}** \nhttps://media.discordapp.net/attachments/757532069885902888/1148618660374646804/PIX_-_Copia.png`);
              

                
                db.run("DELETE FROM work_start_times WHERE user_id = ?", [user.id]);
                
                clearInterval(ongoingWorkMessages.get(user.id + "_interval"));
                ongoingWorkMessages.delete(user.id);
                ongoingWorkMessages.delete(user.id + "_interval");
            } else {
                interaction.reply('**🕓 Você não começou a trabalhar ainda. Use /iniciartrabalho primeiro.**');
            }
        });
    }
});

client.login(TOKEN );
