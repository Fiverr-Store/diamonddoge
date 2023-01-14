
let web3Modal;
let provider;
let web3;
let web3_main;

const Web3Modal = window.Web3Modal.default;
const walletConnectProvider = window.WalletConnectProvider.default;

let selectedAccount;
let mintContract;
let rewardContract;

async function connectWallet() {
	const providerOptions = {
		walletconnect: {
			package: walletConnectProvider,
			options: {
				// Mikko's test key - don't copy as your mileage may var
				rpc: {
					56: "https://bsc-dataseed.binance.org"
				},
				network: "binance",
			}
		},

	};

	web3Modal = new Web3Modal({
		network: 'binance',
		cacheProvider: false, // optional
		providerOptions, // required
		disableInjectedProvider: false, // optional. For MetaMask / Brave / Opera.
	});


	provider = await web3Modal.connect();

	web3 = new Web3(provider);

	const chainId = await web3.eth.getChainId();
	const chainData = evmChains.getChain(chainId);
	const accounts = await web3.eth.getAccounts();

	selectedAccount = accounts[0];
	mintContract = new web3.eth.Contract(mintAbi, mintAddr);

	rewardContract = new web3.eth.Contract(rewardAbi, rewardAddr);
	

	$("#mintConnectButton").html(formatAddr(selectedAccount));

	let res;
	try {
		res = await mintContract.methods.walletOfUser(selectedAccount).call();
	} catch (e) {
		alert(e.toString());
	}
	if (res.length > 0) {
		$("#showNFT").empty();
	}


	$("#connectButton").css('display', 'none');
	$(".dropdown").css('display', 'block');
	$("#mintConnectButton").html(formatAddr(selectedAccount));
	$("#title").css('display', 'none');
	$("#inventory").css('display', 'block');
	$("#nftDialogNotifier").css('display', 'block');
	$("#inventory").html(`YOU HAVE ${res.length} NFTs IN YOUR INVENTORY`);


	await renderNfts()
}

async function disconnect() {
	if (provider) {
		try {
			await provider.close();
		} catch (e) {
		}
		provider = null;
		await web3Modal.clearCachedProvider();
	}
	selectedAccount = '';
	$("#connectButton").css('display', 'inline-block');
	$("#title").css('display', 'block');
	$(".dropdown").css('display', 'none');
	$("#price").css('display', 'none');
	$("#inventory").css('display', 'none');
	$("#claimedRewardsReports").css('display', 'none')
	$("#claim-all-rewards").css('display', 'none');
	$("#nftDialogNotifier").css('display', 'none');




	$("#showNFT").empty();
}

async function getMintValue() {
	mintContract = new web3.eth.Contract(mintAbi, mintAddr);
	let value = await mintContract.methods.getMintValue().call();
	return value;
}

async function renderNft(result) {
	let buttonId = "#claim-reward-" + result.edition;
	const nftId = result.edition;
	const imgUrl = pinataBaseUrl + result.image.slice(7);
	let NFTHolderReward = await rewardContract.methods.NFTHolderReward(nftId).call();
	NFTHolderReward = Number(NFTHolderReward);
	let readebleNftReward =  readeblePriceFormat(NFTHolderReward)
	html = `<div class="col-12 col-sm-6 col-md-4 col-3 mb-4"><div >  <a href="${result.image}" data-lightbox="image-${nftId}" ><img src="${result.image}" class="mind-nft"></div><button onClick="claimRewards(${nftId})" style="display:block" class="btn btn-success mind-nft claim-reward mt-0" id="claim-reward-${nftId}"></a>Claim Rewards - <span class="rewardTokenAmount">${readebleNftReward} MND</span></button><button onclick="openTransferDialog(${nftId})" style="display:block" class="p-2 btn btn-primary mind-nft claim-reward mt-0" id="transferModalBtn-${nftId}" >Transfer</button></div>`;
	$("#showNFT").append(html);
	if(NFTHolderReward > 0) {
		$(buttonId).css('display', 'block')
	}else{
		$(buttonId).addClass('disabled')
		$(buttonId).html('No Rewards Yet')


	}
}

async function renderNfts() {

	let res = await mintContract.methods.walletOfUser(selectedAccount).call();
	$("#inventory").html(`YOU HAVE ${res.length} NFTs IN YOUR INVENTORY`);

	if (res.length >= 0) {
		$("#showNFT").empty();
		$("#nftDialogNotifier").removeClass("d-none");
	} else {
		$("#nftDialogNotifier").addClass("d-none");
	}
	let tatalRewardAmount= 0;
	res.forEach(async (item) => {
		let NFTHolderReward = await rewardContract.methods.NFTHolderReward(item).call();
		let amountOfRewardByAddress = Number(await rewardContract.methods.amountOfRewardByAddress(selectedAccount).call());
		 tatalRewardAmount += Number(NFTHolderReward);
		if(tatalRewardAmount > 0) {
			$("#claim-all-rewards").css('display', 'inline-block');
			$("#claim-all-rewards").html(`CLAIM ALL REWARDS - <span class="rewardTokenAmount">${readeblePriceFormat(tatalRewardAmount)} MND</span>`);
		}else{
			$("#claim-all-rewards").css('display', 'inline-block');
			$("#claim-all-rewards").html(`NO REWARDS YET`);
			$("#claim-all-rewards").addClass(`disabled`);

		}
		
		$("#claimedRewardsReports").html(`YOU CLAIMED <span class="rewardTokenAmount">${readeblePriceFormat(amountOfRewardByAddress)}</span> REWARD TOKENS SINCE NOW`);
		$("#claimedRewardsReports").css('display', 'block')

		let uri =  await mintContract.methods.tokenURI(item).call();
		uri = pinataBaseUrl + uri.slice(7);
		var requestOptions = {
			method: 'GET',
			redirect: 'follow'
		};

		fetch(uri, requestOptions)
			.then(response => response.json())
			.then(renderNft)
			.catch(error => console.log('error', error));

	})
}

async function mint() {

	let value = await getMintValue();
	let amount = $("#mintAmount").val() * 1;
	value = value * amount;

	try {
		await mintContract.methods.mint(amount).send({
			from: selectedAccount,
			value: value
		});
	} catch (e) {
		alert(e.toString())
	}

	$("#result").css('display', 'block');
	setTimeout(() => {
		$("#result").css('display', 'none');
	}, 5000)

	$("#mintAmount").val(1);

	mintedAmount = await mintContract.methods.getCurrentMintCount().call();

	let percent = mintedAmount / 1000 * 100;
	if (percent > 70) {
		$("#progress3").css('width', `${percent - 70}%`);
	} else {
		if (percent > 40) {
			$("#progress2").css('width', `${percent - 40}%`);
		} else {
			$("#progress1").css('width', `${percent}%`);
		}
	}
	$("#total").html(`${mintedAmount} / 1000`);

	await renderNfts()
}

function openTransferDialog(nftId) {
	$("#transferAddressInput").val("");
	$("#transferAddressInput").data("nft-id", nftId);
	$('#transferModal').modal('show');

}

async function claimRewards(nftid) {
	let transferSuccess = false;
	try {
		const claimRewardsTx = await rewardContract.methods.claimRewards(nftid).send({
			from: selectedAccount,
		})

		if (claimRewardsTx.blockHash) {
			transferSuccess = true;
		}
	} catch (error) {
		alert(error.toString())
	}
	if (transferSuccess) {
		await renderNfts()
	}
}

async function claimAllRewards() {
	let transferSuccess = false;
	try {
		const claimRewardsTx = await rewardContract.methods.claimRewardAll().send({
			from: selectedAccount,
		})

		if (claimRewardsTx.blockHash) {
			transferSuccess = true;
		}
	} catch (error) {
		alert(error.toString())
	}
	if (transferSuccess) {
		await renderNfts()
	}
}

async function transferNft() {
	const nftId = $("#transferAddressInput").data("nft-id");
	const address = $("#transferAddressInput").val();
	let transferSuccess = false;

	try {
		const transferResult = await mintContract.methods.transferFrom(selectedAccount, address, nftId).send({
			from: selectedAccount,
		});

		if (transferResult.blockHash) {
			transferSuccess = true;
		}
	} catch (e) {
		alert(e.toString())
	}

	if (transferSuccess) {
		$('#transferModal').modal('hide');
		$('#transferModal').modal('dispose');
		alert("Transfer success!");
		await renderNfts()
	}
}

function formatAddr(str) {
	let ret;
	ret = str.substring(0, 6) + '...' + str.substring(38, 42);
	return ret;
}

async function changeAmount() {
	let mintPrice;
	const getMintNumber = document.getElementById("mintAmount").value;

	try {
		mintPrice = await tmpContract.methods.getMintValue().call();
	} catch (e) {
		console.log(e.toString());
	}

	mintPrices = mintPrice / Math.pow(10, 18);

	snc = mintPrices * getMintNumber;

	snc = snc.toFixed(1);

	$("#mintPrice").html(`${snc} BNB`);


}


$(async function () {

	$(".dropdown").css('display', 'none');
	web3BaseUrl_main = 'https://bsc-dataseed.binance.org';

	tmpWeb3 = new Web3(new Web3.providers.HttpProvider(web3BaseUrl_main));
	tmpContract = new tmpWeb3.eth.Contract(mintAbi, mintAddr);
	mintedAmount = await tmpContract.methods.getCurrentMintCount().call();

	let percent = mintedAmount / 1000 * 100;

	if (percent > 70) {
		$("#progress3").css('width', `${percent - 70}%`);
		$("#progress2").css('width', `30%`);
		$("#progress1").css('width', `40%`);
	} else {
		if (percent > 40) {
			$("#progress2").css('width', `${percent - 40}%`);
			$("#progress1").css('width', `40%`);
		} else {
			$("#progress1").css('width', `${percent}%`);
		}
	}
	// $("#progress").css(`width`, `${percent}%`);
	$("#total").html(`${mintedAmount} / 1000`);

	let mintPrice = await tmpContract.methods.getMintValue().call();
	mintPrice = mintPrice / Math.pow(10, 18);
	$("#mintPrice").html(`${mintPrice} BNB`);

})

 function readeblePriceFormat (price) {
	if(price == 0 || price == "0"){return 0}
	price = price.toString()
	price =  price.substring(0, price.length-9);
	return  price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");	
}



