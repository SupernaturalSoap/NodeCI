const puppeteer = require('puppeteer');

const userFactory = require('../factories/userFactory');
const sessionFactory = require('../factories/sessionFactory');

class CustomPage {
    static async build() {
        const browser = await puppeteer.launch({
            // headless: false
            headless: true,
            args: ['--no-sandbox']
        });

        const page = await browser.newPage();
        const customPage = new CustomPage(page);

        return new Proxy(customPage, {
            get: function(target, property) {
                return customPage[property] || browser[property] || page[property]
            }
        });
    }

    constructor(page) {
        this.page = page;
    }

    async login() {
        const user = await userFactory();
        const { session, sig } = sessionFactory(user);

        await this.page.setCookie({ name: 'session', value: session });
        await this.page.setCookie({ name: 'session.sig', value: sig });

        //reloading page below
        await this.page.goto('localhost:3000/blogs');
        await this.page.waitFor('a[href="/auth/logout"]');
    }

    async getContentsOf(element) {
        const text = await this.page.$eval(element, el => el.innerHTML);
        return text;
    }

    async get(path) {
        return this.page.evaluate(_path => {
                return fetch(_path, {
                    method: 'GET',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).then(res => res.json());
        }, path);
    }

    async post(path, data) {
        return this.page.evaluate(
            (_path, _data) => {
                return fetch(_path, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(_data)
                });
        }, path, data);
    }

    async execRequests(actions) {
        return Promise.all(actions.map(({method, path, data}) => {
            return this[method](path, data);
        }));
    }
}


module.exports = CustomPage;