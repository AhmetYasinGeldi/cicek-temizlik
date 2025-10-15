function authorizeAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Yönetici yetkisi gereklidir.' });
    }
}

module.exports = authorizeAdmin;