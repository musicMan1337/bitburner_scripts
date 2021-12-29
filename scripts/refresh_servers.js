/** @param {import(".").NS} ns */
export async function main(ns) {
    let size = 64;
    let silent = false;
    if (ns.args.length > 0) {
        [size, silent] = ns.args;
    }

    if (isNaN(size)) {
        size = 64;
        silent = true;
    }

    let files = ['weaken.script', 'grow.script', 'hack.script', 'daemon.js'];
    let price = 55000 * size;
    let i = ns.getPurchasedServers().length;
    while (i < 25) {
        let newHostname = 'pserv-' + size + 'gb-' + i;

        ns.print('attempt purchase: ' + newHostname);

        if (ns.getServerMoneyAvailable('home') > price) {
            ns.purchaseServer(newHostname, size);
            ns.print('purchased ' + newHostname);
            ns.tprint('purchased ' + newHostname);

            if (!silent) {
                //start scripts on new server
                await ns.scp(files, 'home', newHostname);
                ns.exec('main_hack.js', 'home', 1, newHostname);
            }

            ++i;
        }

        if (ns.getServerMoneyAvailable('home') < price) {
            await ns.sleep(10000);
        }
    }

    //upgrade existing servers
    let servers = ns.getPurchasedServers();

    i = 0;
    while (i < 25) {
        ns.print('================================================================================');
        let server = servers[i];
        let serverNumber = server.match(/(\d+)$/)[0] * 1;
        let size = ns.getServerMaxRam(server);

        let newSize = 0;
        if (ns.args.length > 0) {
            newSize = ns.args[0];
        }

        if (isNaN(newSize)) {
            newSize = 0;
        }

        if (!newSize) {
            newSize = 2 * size;
        }

        ns.print(`looking at server: ${server} - current size: ${size} -> ${newSize}`);

        let price = 55000 * newSize;
        if (size < newSize) {
            let newHostname = 'pserv-' + newSize + 'gb-' + serverNumber;

            ns.print(`attempt upgrade: ${server} -> ${newHostname} for ${price}`);

            if (ns.getServerMoneyAvailable('home') > price) {
                if (ns.getServerUsedRam(server) > 0) {
                    ns.killall(server);

                    while (ns.getServerUsedRam(server) > 0) {
                        ns.print('waiting for scripts to be killed');
                    }
                }

                ns.deleteServer(server);
                ns.purchaseServer(newHostname, newSize);

                ns.print('purchased ' + newHostname);
                ns.tprint('purchased ' + newHostname);

                if (!silent) {
                    //start scripts on new server
                    await ns.scp(files, 'home', newHostname);
                    ns.exec('main_hack.js', 'home', 1, newHostname);
                }

                ++i;
            }
        }

        if (size >= newSize) {
            i++;
        }

        if (serverNumber == 24) {
            i = 26;
        }

        if (ns.getServerMoneyAvailable('home') < price) {
            await ns.sleep(20000);
        }
    }
}
