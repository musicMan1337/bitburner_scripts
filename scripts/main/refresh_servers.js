/** @param {import(".").NS} ns */
export async function main(ns) {
    let newSize = 0;
    let silent = false;
    if (ns.args.length > 0) {
        [newSize, silent] = ns.args;
    }

    if (isNaN(newSize)) {
        newSize = 0;
        silent = true;
    }

    let files = ['weaken.script', 'grow.script', 'hack.script', 'daemon.js'];
    let servers = ns.getPurchasedServers();

    if (servers.length < 25) {
        //buy servers until max
        if (!newSize) {
            newSize = 64;
        }

        let price = ns.getPurchasedServerCost(newSize);

        let i = servers.length;
        while (i < 25) {
            ns.print('');
            ns.print('===');
            ns.print('');
            let newHostname = 'pserv-' + newSize + 'gb-' + i;

            ns.print(`attempting to purchase ${newHostname} for ${ns.nFormat(price, '$0.000a')}`);

            if (ns.getServerMoneyAvailable('home') > price) {
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

            if (ns.getServerMoneyAvailable('home') < price) {
                await ns.sleep(10000);
            }
        }
    } else {
        // upgrade existing servers
        let i = 0;
        while (i < 25) {
            ns.print('');
            ns.print('===');
            ns.print('');
            let oldServerName = servers[i];
            let oldServerSize = ns.getServerMaxRam(oldServerName);
            let newServerSize = newSize;

            if (!newServerSize) {
                newServerSize = 2 * oldServerSize;
            }

            let price = ns.getPurchasedServerCost(newServerSize);

            ns.print(`looking at server: ${oldServerName} - size: ${oldServerSize} -> ${newServerSize}`);

            if (oldServerSize < newServerSize) {
                let newHostname = 'pserv-' + newServerSize + 'gb-' + i;

                ns.print(`attempt upgrade: ${oldServerName} -> ${newHostname} for ${ns.nFormat(price, '$0.000a')}`);

                if (ns.getServerMoneyAvailable('home') > price) {
                    ns.killall(oldServerName);
                    let deleted = ns.deleteServer(oldServerName);

                    if (deleted) {
                        ns.purchaseServer(newHostname, newServerSize);

                        ns.print('purchased ' + newHostname);
                        ns.tprint('purchased ' + newHostname);

                        if (!silent) {
                            //start scripts on new server
                            await ns.scp(files, 'home', newHostname);
                            ns.exec('main_hack.js', 'home', 1, newHostname);
                        }
                    } else {
                        ns.print(`${oldServerName} deletion failed`);
                    }
                    ++i;
                }
            }

            if (oldServerSize >= newServerSize) {
                i++;
            }

            if (ns.getServerMoneyAvailable('home') < price) {
                await ns.sleep(20000);
            }
        }
    }
}
