var fs = require('fs');
const https = require("https");
const http = require('http');
const url= require('url');
const {Client} = require("whatsapp-web.js");

if (fs.existsSync('./config.json')) {
  var sessionCfg = require('./config.json');
}



const client = new Client({puppeteer: {headless: false
 , args: [
        '--log-level=3', // fatal only
        '--start-maximized',
        '--no-default-browser-check',
        '--disable-infobars', 
        '--disable-web-security',
        '--disable-site-isolation-trials',
        '--no-experiments',
        '--ignore-gpu-blacklist',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-default-apps',
        '--enable-features=NetworkService',
        '--disable-setuid-sandbox',
        '--no-sandbox'
      ]
} ,session:sessionCfg});
// You can use an existing session and avoid scanning a QR code by adding a "session" object to the client options.
// This object must include WABrowserId, WASecretBundle, WAToken1 and WAToken2.


http.createServer(async function (req, res) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    // console.log(req);
    var url_parts = url.parse(req.url,true);
    console.log(url_parts.query.action);
    switch (url_parts.query.action) {
	case 'getChatById':
		console.log(`el chat {$url_parts.query.chatId}`);
		var chat= await client.getChatById(url_parts.query.chatId);
		res.write(JSON.stringify(chat));
		break;
	case 'getChats':
		var chat= await client.getChats();
		res.write(JSON.stringify(chat));
		break;
	case 'sendMessage':
		await client.sendMessage(url_parts.query.chatId, url_parts.query.message);
		
		break;
	case 'sendMessage':
		await client.sendMessage(url_parts.query.chatId, url_parts.query.message);
		
		break;		
	default:
		break;
	} 

    res.end();
}).listen(8888);

client.initialize();

client.on('qr', (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    console.log('QR RECEIVED', qr);
});

client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    if (!fs.existsSync('./config.json')) {
        fs.writeFile("./config.json", JSON.stringify(session), function(err) {
            if (err) {
                console.log(err);
            }
        });

    }
    
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessfull
    console.error('AUTHENTICATION FAILURE', msg);
})

client.on('ready', () => {
    console.log('READY');
});

client.on('message', async msg => {
    console.log('MESSAGE RECEIVED', msg);
    
    if(msg.body == '!mediainfo' && msg.hasMedia) {
      const attachmentData = await msg.downloadMedia();
      msg.reply(`
          *Media info*
          MimeType: ${attachmentData.mimetype}
          Filename: ${attachmentData.filename}
          Data (length): ${attachmentData.data.length}
      `);    
	  transmitMessage(msg);
	  if (msg.body == 'IsAlive?') {
		  // Send a new message as a reply to the current one
		  msg.reply('YesSir');
	  }

//    if (msg.body == '!ping reply') {
//        // Send a new message as a reply to the current one
//        msg.reply('pong');
//
//    } else if (msg.body == '!ping') {
//        // Send a new message to the same chat
//        client.sendMessage(msg.from, 'pong');
//
//    } else if (msg.body.startsWith('!subject ')) {
//        // Change the group subject
//        let chat = await msg.getChat();
//        if(chat.isGroup) {
//            let newSubject = msg.body.slice(9);
//            chat.setSubject(newSubject);
//        } else {
//            msg.reply('This command can only be used in a group!');
//        }
//    } else if (msg.body.startsWith('!echo ')) {
//        // Replies with the same message
//        msg.reply(msg.body.slice(6));
//    } else if (msg.body.startsWith('!desc ')) {
//        // Change the group description
//        let chat = await msg.getChat();
//        if(chat.isGroup) {
//            let newDescription = msg.body.slice(6);
//            chat.setDescription(newDescription);
//        } else {
//            msg.reply('This command can only be used in a group!');
//        }
//    } else if (msg.body == '!leave') {
//        // Leave the group
//        let chat = await msg.getChat();
//        if(chat.isGroup) {
//            chat.leave();
//        } else {
//            msg.reply('This command can only be used in a group!');
//        }
//    } else if(msg.body == '!groupinfo') {
//        let chat = await msg.getChat();
//        if(chat.isGroup) {
//            msg.reply(`
//                *Group Details*
//                Name: ${chat.name}
//                Description: ${chat.description}
//                Created At: ${chat.createdAt.toString()}
//                Created By: ${chat.owner.user}
//                Participant count: ${chat.participants.length}
//            `);
//        } else {
//            msg.reply('This command can only be used in a group!');
//        }
//    } else if(msg.body == '!chats') {
//        const chats = await client.getChats();
//        client.sendMessage(msg.from, `The bot has ${chats.length} chats open.`);
//    } else if(msg.body == '!mediainfo' && msg.hasMedia) {
//        const attachmentData = await msg.downloadMedia();
//        msg.reply(`
//            *Media info*
//            MimeType: ${attachmentData.mimetype}
//            Filename: ${attachmentData.filename}
//            Data (length): ${attachmentData.data.length}
//        `);
//    }
});

function transmitMessage(msg){


	var httpsOptions = {
	  host: 'www.todoalojamiento.com',
	  port: 443,
	  path: '/rest/mensajes/whatsapp/mensaje',
	  method: 'POST'
	};

	var req = https.request(httpsOptions, function(res) {
	  console.log('STATUS: ' + res.statusCode);
	  console.log('HEADERS: ' + JSON.stringify(res.headers));
	  res.setEncoding('utf8');
	  res.on('data', function (chunk) {
	    console.log('BODY: ' + chunk);
	  });
	});

	req.on('error', function(e) {
	  console.log('problem with request: ' + e.message);
	});

	// write data to request body
	req.write(JSON.stringify(msg));

	req.end();
	
}


client.on('message_create', (msg) => {
    // Fired on all message creations, including your own
    if(msg.fromMe) {
        // do stuff here
    }
})

client.on('disconnected', () => {
    console.log('Client was logged out');
})




