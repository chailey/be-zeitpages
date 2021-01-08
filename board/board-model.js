const { whereNull } = require("../data/db-config.js");
const db = require("../data/db-config.js");
const likeRegex = /LIKE::(\d+)/i
const replyRegex = /REPLY::(\d+)/i
const zaddrRegex = /zs[a-z0-9]{76}/i;

module.exports = {
    getAll,
    getPage,
    remove,
    add,
    getCount,
    findById,
    getPinned,
    getDaysLikes
}

function getCount() {
    return db('board_posts').count("id as CNT")
}

async function findById(id) {
    const replies = await db("board_posts").where({"reply_to_post" : id}).orderBy("datetime", "desc")
    const post = await db('board_posts')
        .where({id})
        .first()
    post.replies = replies
    return post
}

async function getDaysLikes() {
    const aDayAgo = Date.now() - (1000 * 60 * 60 * 25)
    const likes = await db("board_posts").whereNotNull("reply_zaddr").andWhere("datetime", ">", aDayAgo).andWhere('memo', 'like', 'LIKE::%')
    const hash = {}
    likes.forEach(like => {
        let zaddr = like.reply_zaddr
        if (hash[zaddr]) {
            hash[zaddr] += 1
        } else {
            hash[zaddr] = 1
        }
    })

    return hash

}

function getAll() {
    return db('board_posts').returning("*")
}

function getPinned() {
    return db('board_posts').where("datetime", ">", 1607810569).andWhere('amount', ">=", '10000000').orderBy("amount", "desc").first()
}

function getPage(page) {
    return db('board_posts').whereNull('reply_to_post').orderBy('id', 'desc').limit(25).offset(25 * (page-1)).returning("*")
}

async function add(post) {
    if (post.memo.match(likeRegex)) {
        const like = post.memo.match(likeRegex)[0]
        const postId = like.split("::")[1].split(" ")[0]
        const likedPost = await db('board_posts').where({id: postId}).first()
        return db('board_posts').where({id: postId}).update({likes: likedPost.likes + 1})
    } else {
        if (post.memo.match(zaddrRegex)) {
            const replyZaddr = post.memo.match(zaddrRegex)[0];
            post.reply_zaddr = replyZaddr;
        }
        if (post.memo.match(replyRegex)) {
            const replyId = post.memo.match(replyRegex)[0].split("::")[1]
            const repliedPost = await db('board_posts').where({id: replyId}).first()
            if (repliedPost) {
                await db('board_posts').where({id: replyId}).update({reply_count: repliedPost.reply_count + 1})
            }
            post.reply_to_post = replyId;
        }

        return db('board_posts').insert(post).returning("*")
    }
}

function remove(id) {
    return db('board_posts')
    .where({ id })
    .first()
    .del();
  }


