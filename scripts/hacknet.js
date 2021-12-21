/** @param {import(".").NS} ns */
export async function main(ns) {
    ns.disableLog('sleep');
    ns.disableLog('getServerMoneyAvailable');

    // We will not buy anything if there's less money than this ammount
    let reserveMoney = 1000;
    let hacknet = ns.hacknet;

    // Buy first HacknetNode if there are none
    if (hacknet.numNodes() === 0 && ns.getServerMoneyAvailable('home') >= reserveMoney) {
        hacknet.purchaseNode();
        ns.print('Purchased ' + hacknet.getNodeStats(hacknet.numNodes() - 1).name + ' because there was none.');
    }

    // If there are no Hacknet Nodes, we can't do anything, so the script ends
    let numUpgrades = 1;
    while (hacknet.numNodes() > 0) {
        // If there is not enough money, we wait for it instead of ending
        // the loop.
        while (ns.getServerMoneyAvailable('home') >= reserveMoney) {
            for (let i = 0; i < hacknet.numNodes(); i++) {
                while (
                    hacknet.getLevelUpgradeCost(i, numUpgrades) < ns.getServerMoneyAvailable('home') * 0.1 &&
                    hacknet.upgradeLevel(i, numUpgrades)
                ) {
                    ns.print('Upgraded ' + hacknet.getNodeStats(i).name + ' to level ' + hacknet.getNodeStats(i).level);
                }

                while (
                    hacknet.getRamUpgradeCost(i, numUpgrades) < ns.getServerMoneyAvailable('home') * 0.1 &&
                    hacknet.upgradeRam(i, numUpgrades)
                ) {
                    ns.print('Upgraded ' + hacknet.getNodeStats(i).name + ' RAM to ' + hacknet.getNodeStats(i).ram);
                }

                while (
                    hacknet.getCoreUpgradeCost(i, numUpgrades) < ns.getServerMoneyAvailable('home') * 0.1 &&
                    hacknet.upgradeCore(i, numUpgrades)
                ) {
                    ns.print('Upgraded ' + hacknet.getNodeStats(i).name + ' core to ' + hacknet.getNodeStats(i).core);
                }
            }

            // Buy next Hacknet Node if the last one is already fully
            // upgraded. If for some reason the last Hacknet Node is fully
            // upgraded and the others don't, the loop above will still
            // attempt to upgrade them all.
            if (
                hacknet.getLevelUpgradeCost(hacknet.numNodes() - 1, numUpgrades) === Infinity &&
                hacknet.getRamUpgradeCost(hacknet.numNodes() - 1, numUpgrades) === Infinity &&
                hacknet.getCoreUpgradeCost(hacknet.numNodes() - 1, numUpgrades) === Infinity &&
                hacknet.getPurchaseNodeCost() < ns.getServerMoneyAvailable('home') * 0.1
            ) {
                hacknet.purchaseNode();
                ns.print(
                    `Purchased ${
                        hacknet.getNodeStats(hacknet.numNodes() - 1).name
                    } because the last one couldn't be upgraded further.`
                );
            } else if (
                // Or buy the next Hacknet Node if the next upgrade is more
                // expensive than buying a new Hacknet Node.
                hacknet.getLevelUpgradeCost(hacknet.numNodes() - 1, numUpgrades) > hacknet.getPurchaseNodeCost() &&
                hacknet.getRamUpgradeCost(hacknet.numNodes() - 1, numUpgrades) > hacknet.getPurchaseNodeCost() &&
                hacknet.getCoreUpgradeCost(hacknet.numNodes() - 1, numUpgrades) > hacknet.getPurchaseNodeCost() &&
                hacknet.getPurchaseNodeCost() < ns.getServerMoneyAvailable('home') * 0.1
            ) {
                hacknet.purchaseNode();
                ns.print(
                    `Purchased ${
                        hacknet.getNodeStats(hacknet.numNodes() - 1).name
                    } because it was cheaper than next upgrade.`
                );
            }

            await ns.sleep(1000);
        }
        await ns.sleep(1000);
    }
}
