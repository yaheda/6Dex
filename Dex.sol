pragma solidity 0.6.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
//import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/IERC20.sol";

contract Dex {

  struct Token {
    bytes32 ticker;
    address tokenAddress;
  }

  enum Side {
    BUY,
    SELL
  }

  struct Order {
    uint id;
    Side side;
    bytes32 ticker;
    uint amount;
    uint filled;
    uint price;
    uint date;
  }

  mapping(bytes32 => Token) public tokens;
  bytes32[] public tokenList;
  address public admin;

  mapping(address => mapping(bytes => uint)) public traderBalances;

  mapping(bytes32 => mapping(uint => Order[])) public orderBook;
  uint public nextOrderId;
  bytes32 constant DAI = bytes("DAI");

  constructor() public {
    admin = msg.sender;
  }

  function addToken(bytes32 ticker, address tokenAddress) onlyAdmin() external {
    tokens[ticker] = Token(ticker, tokenAddress);
    tokenList.push(ticker);
  }

  function deposit(uint _amount, bytes32 _ticker) tokenExist(_ticker) external {
    IERC20(tokens[_ticker].tokenAddress)
      .transferFrom(msg.sender, address(this), _amount);

    traderBalances[msg.sender][_ticker] += _amount;
  }

  function withdraw(uint _amount, bytes32 _ticker) tokenExist(_ticker) external {
    require(traderBalances[msg.sender][_ticker] >= _amount, "balance too low");
    IERC20(tokens[_ticker].tokenAddress)
      .transfer(msg.sender, _amount);

    traderBalances[msg.sender][_ticker] -= _amount;
  }

  function createLimitOrder(bytes32 ticker, uint amount, uint price, Side side) tokenExist(_ticker) external {
    require(ticker != DAI, "cannot trade DAI");
    if (side == Side.SELL) {
      require(traderBalances[msg.sender][ticker] >= amount, "token balance too low");
    } else {
      require(traderBalances[msg.sender][DAI] >= amount * price, "dai balance too low");
    }

    Order[] storage orders = orderBook[ticker][uint(side)];
    orders.push(
      nextOrderId,
      side,
      ticker,
      amount,
      0,
      price,
      now
    );

    //[30, 25, 22, 26] - bubble sort - buy
    uint i = orders.length - 1;
    while (i > 0) {
      if (side == Side.BUY && orders[i - 1].price > orders[i].price) {
        break;
      }
      if (side == Side.SELL && orders[i - 1].price < orders[i].price) {
        break;
      }
      Order memory order = orders[i - 1];
      orders[i - 1] = orders[i];
      i--;
    }

    nextOrderId;

  }

  modifier tokenExist(bytes32 _ticker) {
    require(tokens[_ticker].tokenAddress != address(0), "token does not exsist");
    _;
  }

  modifier onlyAdmin() {
    require(msg.sender == admin, "only admin");
    _;
  }

}