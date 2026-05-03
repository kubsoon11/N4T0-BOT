const { 
    Client, GatewayIntentBits, PermissionFlagsBits, ChannelType, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ActivityType 
} = require('discord.js');
const http = require('http');

// 🌐 SERWER WEB (Zoptymalizowany pod Render.com)
// Render wymaga, aby aplikacja nasłuchiwała na porcie zdefiniowanym w zmiennej środowiskowej PORT
const port = process.env.PORT || 8080; 

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write("Bot is running!");
    res.end();
}).listen(port, () => {
    console.log(`✅ Serwer HTTP nasłuchuje na porcie: ${port}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ],
});

// --- ⚙️ KONFIGURACJA ---
const cfg = {
    token: process.env.TOKEN, 
    roleGracz: '1473956345081368753', 
    kanalPowitan: '1350479810169671690',
    kanalPozegnan: '1352744318296789084',
    kanalLogow: '1499810820534698144',
    prefix: '!'
};

client.once('ready', () => {
    console.log(`✅ BOT GOTOWY: ${client.user.tag}`);
    client.user.setActivity('Serwer N4T0', { type: ActivityType.Watching });
});

// 1. POWITANIA I POŻEGNANIA
client.on('guildMemberAdd', async (member) => {
    const chan = member.guild.channels.cache.get(cfg.kanalPowitan);
    if (chan) {
        const welcome = new EmbedBuilder()
            .setTitle('✨ Witaj na serwerze!')
            .setDescription(`Hej ${member}! Jesteś naszym ${member.guild.memberCount} członkiem. Przejdź do weryfikacji!`)
            .setColor('#2ecc71')
            .setThumbnail(member.user.displayAvatarURL());
        chan.send({ embeds: [welcome] });
    }
});

client.on('guildMemberRemove', member => {
    const chan = member.guild.channels.cache.get(cfg.kanalPozegnan);
    if (chan) chan.send(`🏃 **${member.user.tag}** opuścił nas. Żegnaj!`);
});

// 2. MODERACJA I KOMENDY
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (message.content.includes('http') && !message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        await message.delete().catch(() => {});
        return message.channel.send(`🚫 ${message.author}, nie wysyłaj linków!`).then(m => setTimeout(() => m.delete(), 3000));
    }

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

    if (message.content === `${cfg.prefix}setup-weryfikacja`) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('v_btn').setLabel('Zweryfikuj się').setStyle(ButtonStyle.Success).setEmoji('✅')
        );
        const embed = new EmbedBuilder().setTitle('🛡️ Weryfikacja').setDescription('Kliknij przycisk, aby otrzymać rangę.').setColor('Green');
        await message.channel.send({ embeds: [embed], components: [row] });
        message.delete().catch(() => {});
    }

    if (message.content === `${cfg.prefix}setup-tickets`) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('t_rekru').setLabel('Rekrutacja').setStyle(ButtonStyle.Primary).setEmoji('📝'),
            new ButtonBuilder().setCustomId('t_sojusz').setLabel('Sojusz/Fuzja').setStyle(ButtonStyle.Secondary).setEmoji('🤝'),
            new ButtonBuilder().setCustomId('t_pomoc').setLabel('Pomoc').setStyle(ButtonStyle.Danger).setEmoji('🆘')
        );
        const embed = new EmbedBuilder().setTitle('📩 Centrum Pomocy').setDescription('Wybierz powód zgłoszenia poniżej.').setColor('Blue');
        await message.channel.send({ embeds: [embed], components: [row] });
        message.delete().catch(() => {});
    }
});

// 3. OBSŁUGA INTERAKCJI
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'v_btn') {
        const role = interaction.guild.roles.cache.get(cfg.roleGracz);
        if (role) {
            await interaction.member.roles.add(role).catch(e => console.log("Błąd nadawania roli:", e));
            return interaction.reply({ content: '✅ Nadano rangę!', ephemeral: true });
        }
        return interaction.reply({ content: '❌ Błąd: Nie znaleziono roli.', ephemeral: true });
    }

    const types = { 't_rekru': 'REKRUTACJA', 't_sojusz': 'SOJUSZ', 't_pomoc': 'POMOC' };
    if (types[interaction.customId]) {
        const chan = await interaction.guild.channels.create({
            name: `${interaction.customId}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            ],
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('c_claim').setLabel('Przejmij').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('c_res').setLabel('Wynik').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('c_close').setLabel('Zamknij').setStyle(ButtonStyle.Danger)
        );

        await chan.send({ content: `🛎️ **Nowy Ticket: ${types[interaction.customId]}**\nWitaj ${interaction.user}, opisz sprawę.`, components: [row] });
        await interaction.reply({ content: `✅ Otwarto ticket: ${chan}`, ephemeral: true });

        const logs = interaction.guild.channels.cache.get(cfg.kanalLogow);
        if (logs) logs.send(`📂 Ticket **${types[interaction.customId]}** otwarty przez ${interaction.user.tag}`);
    }

    if (interaction.customId === 'c_claim') await interaction.reply(`🙋 Admin **${interaction.user.tag}** przejął ticket!`);
    
    if (interaction.customId === 'c_close') {
        await interaction.reply('🔒 Usuwanie kanału za 5 sekund...');
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }

    if (interaction.customId === 'c_res') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: '❌ Brak uprawnień!', ephemeral: true });
        }
        const resRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('r_y').setLabel('ZDAŁ').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('r_n').setLabel('NIE ZDAŁ').setStyle(ButtonStyle.Danger)
        );
        await interaction.reply({ content: 'Wybierz wynik rekrutacji:', components: [resRow] });
    }

    if (interaction.customId === 'r_y') await interaction.channel.send('🎊 **GRATULACJE!** Zostałeś przyjęty!');
    if (interaction.customId === 'r_n') await interaction.channel.send('❌ **PRZYKRO NAM.** Twoje podanie zostało odrzucone.');
});

client.login(cfg.token);
