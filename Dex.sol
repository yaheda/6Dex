pragma solidity 0.6.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/IERC20.sol";

contract Dex {

  struct Token {
    bytes32 ticker;
    address tokenAddress;
  }

  mapping(bytes32 => Token) public tokens;
  bytes32[] public tokenList;
  address public admin;

  mapping(address => mapping(bytes => uint)) public traderBalances;

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

  modifier tokenExist(bytes32 _ticker) {
    require(tokens[_ticker].tokenAddress != address(0), "token does not exsist");
    _;
  }

  modifier onlyAdmin() {
    require(msg.sender == admin, "only admin");
    _;
  }

}