pragma solidity 0.6.3;

//import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

constract Bat is ERC20 {
  constructor() ERC20("BAT", "Brave browser token") public { }
}