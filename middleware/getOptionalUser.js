const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET;

function getOptionalUser(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return next();
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (!err) {
            req.user = user;
        }
        next();
    });
}

module.exports = getOptionalUser;