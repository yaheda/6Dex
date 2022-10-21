const Dai = artifacts.require("mocks/Dai.sol");
const Bat = artifacts.require("mocks/Bat.sol");
const Rep = artifacts.require("mocks/Rep.sol");
const Zrx = artifacts.require("mocks/Zrx.sol");

const Dex = artifacts.require("mocks/Dex.sol");

const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');


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

});