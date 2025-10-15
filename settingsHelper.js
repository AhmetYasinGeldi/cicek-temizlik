const pool = require('./db');

let settingsCache = null;

async function getSettings() {
    try {
        const result = await pool.query('SELECT * FROM settings');
        const settingsObject = result.rows.reduce((obj, item) => {
            if (item.setting_value === 'true') {
                obj[item.setting_key] = true;
            } else if (item.setting_value === 'false') {
                obj[item.setting_key] = false;
            } else {
                obj[item.setting_key] = item.setting_value;
            }
            return obj;
        }, {});
        return settingsObject;
    } catch (error) {
        console.error("Ayarlar yüklenirken bir hata oluştu:", error);
        return {
            sales_active: false,
            out_of_stock_behavior: 'hide'
        };
    }
}

module.exports = { getSettings };