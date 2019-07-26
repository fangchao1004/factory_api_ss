const Koa = require('koa')
const cors = require('koa2-cors');
const koaBody = require('koa-body')
const Router = require('koa-router');
const compress = require('koa-compress');
const router = new Router();
const app = new Koa()
const options = { threshold: 2048 }

const db = require('./config/db');

app.use(compress(options))
app.use(cors())
app.use(koaBody({ multipart: true }));
app.use(router.routes()).use(router.allowedMethods());

/**
 * 直接传入sqlserver语句 操作数据库
 */
router.post('/obs', async (ctx, next) => {
    // console.log("sql语句：", ctx.request.body.sql);
    try {
        const result = await fetchDataFromDB(ctx.request.body.sql);
        ctx.response.type = 'json'
        ctx.response.body = { code: 0, data: result }
    } catch (error) {
        ctx.response.type = 'json'
        ctx.response.body = { code: -1, data: error }
    }
})

/**
 * 查询所有的交易记录
 */
router.post('/getAllTransactionInfo', async (ctx, next) => {
    try {
        const sql = `SELECT t.*,td.*,a.AccountName FROM [Transaction] t
        LEFT JOIN TransactionDetail td
        ON t.TransactionID = td.TransactionID
        LEFT JOIN Account a
        ON t.AccountID = a.AccountID
        ORDER BY t.TransactionID
        DESC`
        const result = await fetchDataFromDB(sql);
        ctx.response.type = 'json'
        ctx.response.body = { code: 0, data: result }
    } catch (error) {
        ctx.response.type = 'json'
        ctx.response.body = { code: -1, data: error }
    }
})

/**
 * 支持模糊查询某个人的所有交易记录
 */
router.post('/getSomeOneTransactionInfo', async (ctx, next) => {
    try {
        const sql = `SELECT t.*,td.*,a.AccountName FROM [Transaction] t
        LEFT JOIN TransactionDetail td
        ON t.TransactionID = td.TransactionID
        LEFT JOIN Account a
        ON t.AccountID = a.AccountID
        WHERE a.AccountName LIKE '%${ctx.request.body.accountName}%'
        ORDER BY t.TransactionID
        DESC`
        const result = await fetchDataFromDB(sql);
        ctx.response.type = 'json'
        ctx.response.body = { code: 0, data: result }
    } catch (error) {
        ctx.response.type = 'json'
        ctx.response.body = { code: -1, data: error }
    }
})

function fetchDataFromDB(sql) {
    return new Promise((resolve, reject) => {
        db.sql(sql, function (err, result) {
            if (!err) {
                // console.log(result.recordset);
                resolve(result.recordset);
            } else {
                reject('sql语句 操作sqlserver 发生错误');
            }
        })
    })
}

router.get('/version_update', async (ctx, next) => {
    ctx.response.type = 'json'
    ctx.response.body = { code: 0, vn: '0.0.1' }
})

app.listen(3008, () => { console.log('app started at port 3008'); })