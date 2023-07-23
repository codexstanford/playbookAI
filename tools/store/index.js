let STORE = {};

const store = {
  do : async function (args) {
    let key = args.split(' ')[0];
    let value = args.split(' ').slice(1).join(' ');
    STORE[key] = value;

    fs.writeFileSync('store.json', JSON.stringify(STORE, null, 2));
  }
}

module.exports = {
  do: store.do,

  instruction : "STORE <key> <value> store a value in memory",
  keyword: "STORE"
}
