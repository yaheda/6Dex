const Dai = artifacts.require("mocks/Dai.sol");
const Bat = artifacts.require("mocks/Bat.sol");
const Rep = artifacts.require("mocks/Rep.sol");
const Zrx = artifacts.require("mocks/Zrx.sol");

const Dex = artifacts.require("Dex.sol");

const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');


const SIDE = {
  BUY: 0,
  SELL: 1
};

contract('Dex', (accounts) => {
  let dai,bat,rep,zrx;
  let dex;
  const [trader1, trader2] = [accounts[1], accounts[2]];
  const fakeTicker = web3.utils.fromAscii('ZONA');

  /// bytes32 convertion
  const [DAI, BAT, REP, ZRX] = ['DAI', 'BAT', 'REP', 'ZRX']
    .map(ticker => web3.utils.fromAscii(ticker));

  beforeEach(async() => {
    ([dai, bat, rep, zrx] = await Promise.all([
      Dai.new(),
      Bat.new(),
      Rep.new(),
      Zrx.new()
    ]));
    dex = await Dex.new();
    await Promise.all([
      dex.addToken(DAI, dai.address),
      dex.addToken(BAT, bat.address),
      dex.addToken(REP, rep.address),
      dex.addToken(ZRX, zrx.address)
    ]);

    const amount = web3.utils.toWei('1000'); 
    const seedTokenBalance = async (token, trader) => {
      await token.faucet(trader, amount);
      await token.approve(dex.address, amount, { from:trader });
    };

    await Promise.all(
      [dai,bat,rep,zrx].map(
        token => seedTokenBalance(token, trader1)
      )
    );

    await Promise.all(
      [dai,bat,rep,zrx].map(
        token => seedTokenBalance(token, trader2)
      )
    );
    
  });

  it('should deposit tokens', async () => {
    const amount = web3.utils.toWei('100');
    await dex.deposit(amount, DAI, { from: trader1 });

    const balance = await dex.traderBalances(trader1, DAI);
    
    assert(balance.toString() === amount);

  });

  it('token doesnt exist', async () => {
    const amount = web3.utils.toWei('100');    

    await expectRevert(
      dex.deposit(amount, fakeTicker, { from: trader1}),
      'token does not exist'
    );
  });

  it('should withdraw tokens', async () => {
    const amount = web3.utils.toWei('100');
    await dex.deposit(amount, DAI, { from: trader1 });
    await dex.withdraw(amount, DAI, { from: trader1 });
    
    const traderBalance = await dex.traderBalances(trader1, DAI);
    const daiBalance = await dai.balanceOf(trader1);

    assert(traderBalance.isZero(), 'should be equal to amount');
    assert(daiBalance == web3.utils.toWei('1000'), 'dex should be zero');
  });

  it('withdraw - token doesnt exist', async () => {
    const amount = web3.utils.toWei('100');
    await expectRevert(
      dex.withdraw(amount, fakeTicker, { from: trader1 }),
      'token does not exist'
    );
  });

  it('withdraw - enough balance', async () => {
    const amount = web3.utils.toWei('1000000000');
    await expectRevert(
      dex.withdraw(amount, DAI, { from: trader1 }),
      'balance too low'
    );
  });

  it('create limit order - buy', async () => {
    await dex.deposit( web3.utils.toWei('100'), DAI, { from: trader1 });
    await dex.createLimitOrder(REP, web3.utils.toWei('10'), 10, SIDE.BUY, { from: trader1 });

    var orders = await dex.getOrders(REP, SIDE.BUY);
    assert.equal(orders.length, 1, 'has one element');
    assert(orders[0].trader == trader1, 'is trader 1');
    assert(orders[0].ticker == web3.utils.padRight(REP, 64), 'is correct ticker'); // will be padded with 0x
    assert(orders[0].amount == web3.utils.toWei('10'), 'is correct amount');
    assert(orders[0].price.toString() == '10', 'price should be 10');


    await dex.deposit( web3.utils.toWei('200'), DAI, { from: trader2 });
    await dex.createLimitOrder(REP, web3.utils.toWei('10'), 11, SIDE.BUY, { from: trader2 });

    orders = await dex.getOrders(REP, SIDE.BUY);
    assert.equal(orders.length, 2, 'has 2 element');
    assert(orders[0].trader == trader2, 'is trader 2');
    assert(orders[0].price.toString() == '11', 'price should be 11');

    await dex.createLimitOrder(REP, web3.utils.toWei('10'), 9, SIDE.BUY, { from: trader2 });
    orders = await dex.getOrders(REP, SIDE.BUY);
    assert.equal(orders.length, 3, 'has 3 element');
    assert(orders[2].trader == trader2, 'is trader 2');
    assert(orders[2].price.toString() == '9', 'price should be 9');
  });


  it('çreateLimiOrder - token doesnt exsist', async () => {
    await expectRevert(
      dex.createLimitOrder(fakeTicker, web3.utils.toWei('10'), 10, SIDE.BUY, { from: trader1 }),
      'token does not exist'
    );
  });

  it('createLimitOrder - cannot trade Dai', async () => {
    await expectRevert(
      dex.createLimitOrder(DAI, web3.utils.toWei('10'), 10, SIDE.BUY, { from: trader1 }),
      'cannot trade DAI'
    );
  });

  it('createLimitOrder - token balance too low', async () => {
    await expectRevert(
      dex.createLimitOrder(REP, web3.utils.toWei('10'), 10, SIDE.SELL, { from: trader1 }),
      'token balance too low'
    );
  });

  it('createLimitOrder - dai balance too low', async () => {
    await expectRevert(
      dex.createLimitOrder(REP, web3.utils.toWei('10'), 10, SIDE.BUY, { from: trader1 }),
      'dai balance too low'
    );
  });

  /// could also do a variation of partially filled orders
  it('create market order', async () => {
    await dex.deposit(web3.utils.toWei('100'), DAI, { from: trader1 });
    await dex.deposit(web3.utils.toWei('100'), REP, { from: trader2 });

    //await dex.createMarketOrder(REP, web3.utils.toWei('100'), SIDE.BUY, { from: trader1 });
    await dex.createLimitOrder(REP, web3.utils.toWei('10'), 10, SIDE.BUY, { from: trader1 })
    await dex.createMarketOrder(REP, web3.utils.toWei('10'), SIDE.SELL, { from: trader2 });

    const traider1DAIBalance = await dex.traderBalances(trader1, DAI);
    const traider1REPBalance = await dex.traderBalances(trader1, REP);
    
    const traider2DAIBalance = await dex.traderBalances(trader2, DAI);
    const traider2REPBalance = await dex.traderBalances(trader2, REP);

    assert.equal(traider1DAIBalance.toString(), '0', 'a');
    assert.equal(traider1REPBalance.toString(), web3.utils.toWei('10'), 'b');
    assert.equal(traider2DAIBalance.toString(), web3.utils.toWei('100'), 'c');
    assert.equal(traider2REPBalance.toString(), web3.utils.toWei('90'), 'd');

    const sellOrders = await dex.getOrders(REP, SIDE.SELL);
    const buyOrders = await dex.getOrders(REP, SIDE.BUY);

    assert.equal(sellOrders.length, 0, 'e');
    assert.equal(buyOrders.length, 0, 'f');
  });

  it('create market order - token does not exist', async () => {
    await expectRevert(
      dex.createMarketOrder(fakeTicker, web3.utils.toWei('10'), SIDE.SELL, { from: trader2 }),
      'token does not exist'
    );
  });

  it('create market order - cannot trade DAI', async () => {
    await expectRevert(
      dex.createMarketOrder(DAI, web3.utils.toWei('10'), SIDE.SELL, { from: trader2 }),
      'cannot trade DAI'
    );
  });

  it('create market order - token balance too low', async () => {
    await expectRevert(
      dex.createMarketOrder(REP, web3.utils.toWei('10'), SIDE.SELL, { from: trader2 }),
      'token balance too low'
    );
  });

  it('create market order - cannot trade DAI', async () => {
    await dex.deposit(web3.utils.toWei('100'), DAI, { from: trader1 });
    await dex.deposit(web3.utils.toWei('100'), REP, { from: trader2 });

    await dex.createLimitOrder(REP, web3.utils.toWei('20'), 10, SIDE.SELL, { from: trader2 })

    await expectRevert(
      dex.createMarketOrder(REP, web3.utils.toWei('20'), SIDE.BUY, { from: trader1 }),
      'dai balance too low'
    );
  });

});