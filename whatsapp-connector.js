var fs = require('fs');
var qrcode = require('qrcode-terminal');
const https = require("https");
const http = require('http');
const url= require('url');
const {Client} = require("whatsapp-web.js");

if (fs.existsSync('./session.json')) {
  var sessionCfg = require('./session.json');
}
const config = require('./config.json');

const client = new Client({puppeteer: {headless: true
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
var usersData=new Map();

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
		if (req.method === 'POST') {
		    let body = '';
		    req.on('data', chunk => {
		        body += chunk.toString(); // convert Buffer to string
		    });
		    req.on('end',async () => {
		        bodyJson=JSON.parse(body);
				await client.sendMessage(bodyJson.chatId, bodyJson.message);
				console.log(body);
				res.end('ok');
		    });
		}else
			await client.sendMessage(url_parts.query.chatId, url_parts.query.message);
		break;
		
	default:
		break;
	} 

    res.end();
}).listen(config.port);

client.initialize();

client.on('qr', (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr,{small: true});
});

client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    if (!fs.existsSync('./session.json')) {
        fs.writeFile("./session.json", JSON.stringify(session), function(err) {
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
	if (!usersData.has(msg.from)){
		var chat= await client.getChatById(msg.from);
		console.log("adding chat to map")
		usersData.set(msg.from,chat)
	}
    msg.profile=usersData.get(msg.from);
    
    if( msg.hasMedia) {
      const attachmentData = await msg.downloadMedia();
      console.log(`
          *Media info*
          MimeType: ${attachmentData.mimetype}
          Filename: ${attachmentData.filename}
          Data (length): ${attachmentData.data.length}
      `);
      msg.attachmentData=attachmentData;
    }
	transmitMessage(msg);
	if (msg.body == 'IsAlive?') {
	  msg.reply('YesSir');
	}

});

function transmitMessage(msg){

	var httpsOptions = {
	  host: config.resendHost,
	  port: config.resendPort,
	  path: config.resendPath,
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




