const { format } = require('date-fns');
const { v4: uuid } = require('uuid');

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

const logEvents = async (message, logName) => {
    const dateTime = `${format(new Date(), 'yyyyMMdd\tHH:mm:ss')}`;
    const logItem = `${dateTime}\t${uuid()}\t${message}\n`;
    console.log(logItem);
    try {
        if (!fs.existsSync(path.join(__dirname, '..', 'logs'))) {
            await fsPromises.mkdir(path.join(__dirname, '..', 'logs'));
        }
        await fsPromises.appendFile(path.join(__dirname, '..', 'logs', logName), logItem);
    } catch (err) {
        console.log(err);
    }
}

const logger = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown IP';
    logEvents(`${req.method}\t${req.headers.origin || 'Unknown Origin'}\t${req.url}\t${ip}`, 'reqLog.txt');
    console.log(`${req.method} ${req.path} from ${ip}`);
    next();
}

module.exports = { logger, logEvents } ;

