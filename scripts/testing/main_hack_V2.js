/*
One-stop script that can do the following:
1) Runs the base_server_setup.js script on home for early money, will check the RAM on home to determine thread count for each server
2) Will wait until enough money is available to purchase a server with max RAM (1048576), cost ~57 billion each.
NOTE: an alert will indicate you can buy the required software from the darkweb, do this to allow the script to continue.
NOTE2: it cannot be automated early game as the functions to purchase from the darkweb require advanced upgrades
3) Runs the adv_server_setup.js script on the newly purchased server
4) Continues until all 25 servers are purchased.
5) Will continue run in background to purchase hacknet nodes.

Pre-requisites:
- pen_hack_v1.js script (see below main script)
- base_server_setup.js script (see below pen_hack_v1.js)
- adv_server_setup.js script (see below base_server_setup.js)
- back_hack_v1.js (see below adv_server_setup.js)

Known issues:
- Doesn't seem to hack all servers properly, which means some manual work still required; after all servers in scan range have root, the script will run without issue
*/

/** @param {import("./").NS} ns */
export async function main(ns) {
    var homeServer = 'home';
    var availableCash = ns.getServerMoneyAvailable(homeServer);
    var serverCost = ns.getPurchasedServerCost('1048576');
    var homeMaxRam = ns.getServerMaxRam(homeServer);
    var homeUsedRam;
    var hostMaxRam;
    var hostUsedRam;
    var purchasedServerName;
    var ranBaseSetupOnce = 0;
    var nodeCost = ns.hacknet.getPurchaseNodeCost;
    var nodeMax = ns.hacknet.maxNumNodes();
    var serverMax = ns.getPurchasedServers();

    var basicServerList = [
        'iron-gym',
        'harakiri-sushi',
        'hong-fang-tea',
        'joesguns',
        'sigma-cosmetics',
        'foodnstuff',
        'n00dles'
    ];

    var advServerList = [
        'fulcrumtech',
        'helios',
        'vitalife',
        'stormtech',
        'microdyne',
        'titan-labs',
        'applied-energetics',
        'run4theh111z',
        'zb-def',
        'taiyang-digital',
        'nova-med',
        'infocomm',
        'defcomm',
        'univ-energy',
        'solaris',
        'icarus',
        'zeus-med',
        'unitalife',
        'omnia',
        'deltaone',
        'global-pharm',
        'snap-fitness',
        'galactic-cyber',
        'aerocorp',
        'aevum-police',
        'millenium-fitness',
        'lexo-corp',
        'alpha-ent',
        'rho-construction',
        'zb-institute',
        'catalyst',
        'summit-uni',
        'rothman-uni',
        'syscore',
        'I.I.I.I',
        'avmnite-02h',
        'comptek',
        'crush-fitness',
        'the-hub',
        'netlink',
        'johnson-ortho',
        'omega-net',
        'silver-helix',
        'phantasy',
        'neo-net',
        'max-hardware',
        'zer0',
        'nectar-net',
        'iron-gym',
        'harakiri-sushi',
        'hong-fang-tea',
        'joesguns',
        'sigma-cosmetics',
        'foodnstuff',
        'n00dles'
    ];

    // Run the basic set-up script on Home and wait until all programs are bought
    while (ranBaseSetupOnce == 0) {
        ranBaseSetupOnce += 1;

        // Calculate threadcount based on available hosts's RAM, no decimals.
        var threadCount = homeMaxRam / (basicServerList.length * ns.getScriptRam('back_hack_v1.js'));
        threadCount.toPrecision(2);

        // For each server in the server list, run the hack script with calculated threadcount
        for (var i = 0; i < basicServerList.length; i++) {
            // Update RAM usage
            homeUsedRam = ns.getServerUsedRam(homeServer);

            // Check if root access exists, and if not hack the system first
            if (!ns.hasRootAccess(basicServerList)) ns.exec('pen_hack_v1.js', homeServer, 1, basicServerList);

            // Ensure enough RAM exists by calculating script RAM usage (2.4GB * Threadcount)
            if (homeMaxRam - homeUsedRam > 2.4 * threadCount)
                ns.exec('back_hack_v1.js', homeServer, threadCount, basicServerList);
            else break;
        }
    }

    // Check every 5 seconds if we have enough to purchase a server, run advanced setup right after
    for (var j = 0; j < 25; j++) {
        while (availableCash <= serverCost) {
            await ns.sleep('5000');
            availableCash = ns.getServerMoneyAvailable(homeServer);
            if (availableCash > 6000000000 && !ns.fileExists('Formulas.exe', homeServer))
                ns.tprint('You have enough money to purchase the darkweb programs');
        }

        // once we have enough cash, purchase a server with MAX ram amount and name it
        if (availableCash > serverCost && serverMax.length != 24) {
            ns.tprint('Starting server purchase pass: ' + j);

            purchasedServerName = 'fws-vpn-' + j;

            ns.purchaseServer(purchasedServerName, '1048576');

            hostMaxRam = ns.getServerMaxRam(purchasedServerName);

            // Calculate threadcount based on available hosts's RAM, no decimals.
            threadCount = hostMaxRam / (advServerList.length * ns.getScriptRam('back_hack_v1.js'));
            threadCount.toPrecision(2);

            // Copy the script to the host server if it isn't there yet
            if (!ns.fileExists('back_hack_v1.js', purchasedServerName))
                await ns.scp('back_hack_v1.js', homeServer, purchasedServerName);

            ns.tprint('Server purchased: ' + purchasedServerName);

            // For each server in the server list, run the hack script with calculated threadcount
            for (var k = 0; k < advServerList.length; k++) {
                // Update RAM usage
                hostUsedRam = ns.getServerUsedRam(purchasedServerName);

                // Check if root access exists, and if not hack the system first
                if (ns.hasRootAccess(advServerList[k]) == false)
                    ns.exec('pen_hack_v1.js', homeServer, 1, advServerList[k]);

                await ns.sleep('100');

                // Ensure enough RAM exists by calculating script RAM usage (2.4GB * Threadcount)
                if (hostMaxRam - hostUsedRam > 2.4 * threadCount)
                    ns.exec('back_hack_v1.js', purchasedServerName, threadCount, advServerList[k]);
                else break;
            }
        }
    }

    // Start the hacknet node passes
    while (ns.hacknet.numNodes() < nodeMax) {
        nodeCost = ns.hacknet.getPurchaseNodeCost();

        // Purchase the nodes when we have enough money to do so
        if (availableCash > nodeCost + 250000000) {
            var purchaseIndex = ns.hacknet.purchaseNode();
            ns.hacknet.upgradeLevel(purchaseIndex, 199);
            ns.hacknet.upgradeRam(purchaseIndex, 6);
            ns.hacknet.upgradeCore(purchaseIndex, 15);

            ns.tprint('Hacknet node purchased, index[' + purchaseIndex + ']');
        }

        // wait a few seconds before we have them all
        await ns.sleep('5000');
    }
}
