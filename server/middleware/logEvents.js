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

// Routes to exclude from console logging (still logged to file)
const quietRoutes = ['/api/quota-management'];

const logger = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown IP';

    // Check if this route should be quiet (no console output)
    const isQuietRoute = quietRoutes.some(route => req.url.startsWith(route));

    // Always log to file
    logEvents(`${req.method}\t${req.headers.origin || 'Unknown Origin'}\t${req.url}\t${ip}`, 'reqLog.txt');

    // Only log to console if not a quiet route
    if (!isQuietRoute) {
        console.log(`${req.method} ${req.path} from ${ip}`);
    }
    next();
}

module.exports = { logger, logEvents } ;

