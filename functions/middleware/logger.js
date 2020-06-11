const {createLogger, transports} = require('winston');
const logger = createLogger({
    transports: [
        new transports.Console(), 
        new transports.File({filename: "logfile.log"}) 
    ],
    exceptionHandlers: [
        new transports.File({ filename: 'exceptions.log' })
    ],
    handleExceptions: true
})
module.exports = logger
