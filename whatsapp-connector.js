require('console-stamp')(console, '[HH:MM:ss.l]');
var fs = require('fs');
var qrcode = require('qrcode-terminal');
const https = require("https");
const http = require('http');
const url= require('url');
const {Client,Location} = require("whatsapp-web.js");

if (fs.existsSync('./session.json')) {
  var sessionCfg = require('./session.json');
}
const config = require('./config.json');



try{

	//Makes the script crash on unhandled rejections instead of silently
	//ignoring them. In the future, promise rejections that are not handled will
	//terminate the Node.js process with a non-zero exit code.
	process.on('unhandledRejection', (reason, promise) => {
		 console.log('unhandledRejection: ');// + JSON.stringify(promise, null, 2));
		if (reason) console.log(JSON.stringify(reason, null, 2));
		if (promise) console.log(JSON.stringify(promise, null, 2));
		 process.exit(5);
	});

//	var somevar = false;
//	var PTest = function () {
//	    return new Promise(function (resolve, reject) {
//	        if (somevar === true)
//	            resolve();
//	        else
//	            reject();
//	    });
//	}
//	var myfunc = PTest();
//	myfunc.then(function () {
//	     console.log("Promise Resolved");
//	});
//	.catch(function () {
//	     console.log("Promise Rejected");
//	});
	
	var client = new Client({puppeteer: {headless: true
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
		        '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote'	        
		      ]
		} ,session:sessionCfg,authTimeoutMs:145000});
	
	// You can use an existing session and avoid scanning a QR code by adding a "session" object to the client options.
	// This object must include WABrowserId, WASecretBundle, WAToken1 and WAToken2.
	
	var usersData=new Map(); //store user data
	
	var lastMessageTimestamp=new Map(); //store last message time for every chat
	
	function getRandomInt(min, max) {
		  min = Math.ceil(min);
		  max = Math.floor(max);
		  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
		}
	
	setInterval(archiveOldChats, getRandomInt(7, 20)*60*1000);
	
	 function archiveOldChats() {
	  console.log('archiving old chats');
	  const f = async function(value,key,map){
		//  console.debug(Date.now());
		//  console.debug(value);
		//  console.debug(key);
	    	if ((Date.now()-value)>getRandomInt(30, 60)*60*1000){
	    		var chat= await client.getChatById(key);
	    		console.log('archiving '
	    				+key);
	    		chat.archive();
	    		map.delete(key);
	    	}
	    		
	    };
	    console.log(lastMessageTimestamp);
	  
	  lastMessageTimestamp
	    .forEach(f)
	}
	
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
                    var msg=bodyJson.message;
					const regexpGeo = /^(?:geo:)([+-]?\d+\.\d+),([+-]?\d+\.\d+)(?:;label=(.*))?$/m;
					//const str = 'geo:-11.03287,45.89174;label= trinidad y bobago';
					
					const arrGeo = msg.match(regexpGeo);
					
					if (arrGeo) {
					    msg=msg.replace(regexpGeo, '')
						console.log("coordenadas: ");
						var lat = arrGeo[1];
						var long = arrGeo[2];
						console.log(lat);
						console.log(long);
						var label = '';
						if (arrGeo[3]) {
							label = arrGeo[3];
						}
						console.log(label);				

						msgGeo = new Location(lat, long, label);

					}

					if ((arrGeo&&msg!='') ||!arrGeo) // si no encontro coordenadas, o si encontro coordenadas y el mensaje aun tiene algo mas lo manda
						await client.sendMessage(bodyJson.chatId, msg);

					if (arrGeo) 
						await client.sendMessage(bodyJson.chatId, msgGeo);
					
					console.log(body);
//					res.end('ok');
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
	    qrcode.generate(qr,{small: true}, function (qr) {
	        console.log("QR:\n"+qr);
	    });
	});
	
	client.on('authenticated', (session) => {
	    console.log('AUTHENTICATED', session);
	        sessionCfg=session;
	    	fs.writeFile("./session.json", JSON.stringify(session), function(err) {
	            if (err) {
	                console.log(err);
	            }
	        });
	    
	});
	
	client.on('auth_failure',async msg => {
	    // Fired if session restore was unsuccessfull
	    console.error('AUTHENTICATION FAILURE', msg);
	    process.exit(3);
	  
	})
	
	client.on('ready', () => {
	    console.log('READY');
	});
	
	client.on('message', async msg => {
	    console.log('MESSAGE RECEIVED', msg);
	    if (msg.from=='status@broadcast'){
	    	console.log('STATUS MESSAGE');
	    	return;
	    }
	    	
		if (!usersData.has(msg.from)){
			var chat= await client.getChatById(msg.from);
			console.log("adding chat to map");
			var contact="";
	    	Promise.race([
	    		contact= await msg.getContact(),
	    	    
	    	    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 11.5e3))
	    	]).catch(function(err) {
	            if (err.name === 'timeout') {
	            	console.log("timeout getContact.");
	      		    lastMessageTimestamp.delete(msg.from);  //if there is an error I remove chat from the map so that it is not archived in whatsapp
	            }else{
	              throw err;
	            }
	    	});
			
			chat.contact=contact;
			usersData.set(msg.from,chat);
		}
	    msg.profile=usersData.get(msg.from);
	    
	    lastMessageTimestamp.set(msg.from,Date.now());
	    
	    if( msg.hasMedia) {
	    	var attachmentData="";
	    	Promise.race([
	    		attachmentData= await msg.downloadMedia(),
	    	    
	    	    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 11.5e3))
	    	]).catch(function(err) {
	            if (err.name === 'timeout') {
	            	console.log("timeout downloadMedia.");
	      		    lastMessageTimestamp.delete(msg.from);  //if there is an error I remove chat from the map so that it is not archived in whatsapp
	            }else{
	              throw err;
	            }
	    	});
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
		  lastMessageTimestamp.delete(msg.from);  //if there is an error I remove chat from the map so that it is not archived in whatsapp
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
	
		function sleep(ms){
		    return new Promise(resolve=>{
		        setTimeout(resolve,ms)
		    })
		}
	
	client.on('disconnected',async () => {
	    console.log('Client was logged out');
	
	    process.exit(2);
	})

}catch(err){
    console.log(err);

    process.exit(4);
}


