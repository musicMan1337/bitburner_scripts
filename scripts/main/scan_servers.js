/** @param {import(".").NS} ns */
export async function main(ns) {
    let roots = ns.scan('home').filter((node) => node.split('-')[0] !== 'pserv');

    let nodes = {
        home: roots.reduce((obj, node) => {
            let maxMoney = ns.nFormat(ns.getServerMaxMoney(node), '$0.00a');
            let hackingReq = ns.getServerRequiredHackingLevel(node);
            let childName = `${node} - ${maxMoney} - ${hackingReq}`;

            obj[childName] = {};
            return obj;
        }, {})
    };

    roots.unshift('home');

    function traverseNodes(nodeObj, rootNode) {
        if (!nodeObj || !rootNode) {
            return nodeObj;
        }

        let connectedNodes = ns.scan(rootNode).filter((node) => node.split('-')[0] !== 'pserv');

        ns.tprint('');
        ns.tprint('      rootName: ', rootNode);
        ns.tprint('connectedNodes: ', connectedNodes);
        ns.tprint('         roots: ', roots);
        connectedNodes.forEach((childNode) => {
            if (!roots.includes(childNode)) {
                let maxMoney = ns.nFormat(ns.getServerMaxMoney(childNode), '$0.00a');
                let hackingReq = ns.getServerRequiredHackingLevel(childNode);
                let childName = `${childNode} - ${maxMoney} - ${hackingReq}`;

                roots.push(childNode);
                nodeObj[childName] = {};

                traverseNodes(nodeObj[childName], childNode);
            }
        });
    }

    Object.keys(nodes.home).forEach((node) => {
        traverseNodes(nodes.home[node], node.split(' ')[0]);
    });
    await ns.write('servers.txt', JSON.stringify(nodes), 'w');
    ns.tprint(nodes);
}
