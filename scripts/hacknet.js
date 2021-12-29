/** @param {import(".").NS} ns */
export async function main(ns) {
    ns.disableLog('sleep');
    ns.disableLog('getServerMoneyAvailable');

    // We will not buy anything if there's less money than this ammount
    let reserveMoney = 1000;
    let HNT = ns.hacknet;

    // Buy first HacknetNode if there are none
    if (HNT.numNodes() === 0 && ns.getServerMoneyAvailable('home') >= reserveMoney) {
        HNT.purchaseNode();
        ns.print('Purchased ' + HNT.getNodeStats(HNT.numNodes() - 1).name + ' because there was none.');
    }

    // If there are no Hacknet Nodes, we can't do anything, so the script ends
    let numUpgrades = 1;
    while (HNT.numNodes() > 0) {
        // If there is not enough money, we wait for it instead of ending
        // the loop.
        while (ns.getServerMoneyAvailable('home') * 0.1 >= reserveMoney) {
            for (let i = 0; i < HNT.numNodes(); i++) {
                while (
                    HNT.getLevelUpgradeCost(i, numUpgrades) < ns.getServerMoneyAvailable('home') * 0.1 &&
                    HNT.upgradeLevel(i, numUpgrades)
                ) {
                    ns.print('Upgraded ' + HNT.getNodeStats(i).name + ' to level ' + HNT.getNodeStats(i).level);
                }

                while (
                    HNT.getRamUpgradeCost(i, numUpgrades) < ns.getServerMoneyAvailable('home') * 0.1 &&
                    HNT.upgradeRam(i, numUpgrades)
                ) {
                    ns.print('Upgraded ' + HNT.getNodeStats(i).name + ' RAM to ' + HNT.getNodeStats(i).ram);
                }

                while (
                    HNT.getCoreUpgradeCost(i, numUpgrades) < ns.getServerMoneyAvailable('home') * 0.1 &&
                    HNT.upgradeCore(i, numUpgrades)
                ) {
                    ns.print('Upgraded ' + HNT.getNodeStats(i).name + ' core to ' + HNT.getNodeStats(i).core);
                }
            }

            // Buy next Hacknet Node if the last one is already fully
            // upgraded. If for some reason the last Hacknet Node is fully
            // upgraded and the others don't, the loop above will still
            // attempt to upgrade them all.
            if (
                HNT.getLevelUpgradeCost(HNT.numNodes() - 1, numUpgrades) === Infinity &&
                HNT.getRamUpgradeCost(HNT.numNodes() - 1, numUpgrades) === Infinity &&
                HNT.getCoreUpgradeCost(HNT.numNodes() - 1, numUpgrades) === Infinity &&
                HNT.getPurchaseNodeCost() < ns.getServerMoneyAvailable('home') * 0.1
            ) {
                HNT.purchaseNode();
                ns.print(
                    `Purchased ${
                        HNT.getNodeStats(HNT.numNodes() - 1).name
                    } because the last one couldn't be upgraded further.`
                );
            } else if (
                // Or buy the next Hacknet Node if the next upgrade is more
                // expensive than buying a new Hacknet Node.
                HNT.getLevelUpgradeCost(HNT.numNodes() - 1, numUpgrades) > HNT.getPurchaseNodeCost() &&
                HNT.getRamUpgradeCost(HNT.numNodes() - 1, numUpgrades) > HNT.getPurchaseNodeCost() &&
                HNT.getCoreUpgradeCost(HNT.numNodes() - 1, numUpgrades) > HNT.getPurchaseNodeCost() &&
                HNT.getPurchaseNodeCost() < ns.getServerMoneyAvailable('home') * 0.1
            ) {
                HNT.purchaseNode();
                ns.print(
                    `Purchased ${HNT.getNodeStats(HNT.numNodes() - 1).name} because it was cheaper than next upgrade.`
                );
            }

            await ns.sleep(1000);
        }
        await ns.sleep(1000);
    }
}
