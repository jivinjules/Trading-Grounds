// var Company = require('../models').company;
var Company = require('../models').companies;
// var User = require('../models').user;
var yahooFinance = require('yahoo-finance');

module.exports = (app) => {
	
	//	GET Single Stock
	app.get('/stock/:symbol', (req, res) => {
		
		var symbol = req.params.symbol;
		var modules = ['summaryDetail', 'price', 'financialData', 'defaultKeyStatistics', 'summaryProfile'];
		
		yahooFinance.quote({ symbol: symbol, modules: modules }, (err, quote) => {
			if(err) {
				Company.findAll({
					where: {
						company: {
							$like: '%' + req.params.symbol + '%'
						}
					},
					order: [['market_cap', 'DESC']],
					limit: 10
				}).then(company => {
					if(company[0]) {
						console.log('companies:', company);
						res.redirect('/stock/' + company[0].symbol);
					} else {
						req.flash('message', 'Stock not found');
						res.redirect('/dashboard');
					}
				});
			} else {
				var sd = quote.summaryDetail ? quote.summaryDetail : {};
				var sp = quote.summaryProfile ? quote.summaryProfile : {};
				var fd = quote.financialData ? quote.financialData : {};
				var dks = quote.defaultKeyStatistics ? quote.defaultKeyStatistics : {};
				
				if(sd.ask == 0 && sd.bid == 0) {
					var price = parseFloat(sd.previousClose);
				} else if(sd.ask == 0) {
					var price = parseFloat(sd.bid);
				} else {
					var price = parseFloat(sd.ask);
				}
				
// 				var priceFormatted = parseFloat(price).toFixed(2);
// 				priceFormatted = priceFormatted.toLocaleString();
				
				var priceFormatted = format(price, 2);
				
				var div = sd.dividendRate ? format(sd.dividendRate, 2, '') + ' %' : '-';
				var yield = sd.dividendYield ? (sd.dividendYield * 100).toFixed(2) + ' %' : '-';
				
				var change = format(price - parseFloat(sd.previousClose));
				if(parseFloat(change) < 0) {
					var gain = false;
				} else {
					var gain = true;
				}
				
				if(sd.marketCap) {
					var mc = sd.marketCap.toString();
					var abr;
					if(mc.length < 4) {
						abr = '';
					} else if(mc.length < 7) {
						abr = ' K';
					} else if(mc.length < 10) {
						abr = ' M';
					} else if(mc.length < 13) {
						abr = ' B';
					} else {
						abr = ' T';
					}
					if(mc.length >= 3) {
						mc = mc[0] + mc[1] + mc[2];
					}
					mc = '$ ' + mc + abr;
				} else {
					mc = '-';
				}
/*
				if(sd.dividendRate == undefined) {
					var div = '-';
				} else {
					var div = sd.dividendRate
				}
*/
				
/*
				var open = sd.open ? format(sd.open) : '-';
				var close = sd.previousClose ? format(sd.previousClose) : '-';
				var high = sd.dayHigh ? format(sd.dayHigh) : '-';
				var low = sd.dayLow ? format(sd.dayLow) : '-';
				var beta = sd.beta ? sd.beta.toFixed(3) : '-';
				var bid = sd.bid ? sd.bid : '-';
				var bidSize = sd.bidSize ? sd.bidSize : '-';
				var ask = sd.ask ? sd.ask : '-';
				var askSize = sd.askSize ? sd.askSize : '-';
				
*/
				
				stockInfo = {
					open: sd.open ? format(sd.open) : '-',
					close: sd.previousClose ? format(sd.previousClose) : '-',
					high: sd.dayHigh ? format(sd.dayHigh) : '-',
					low: sd.dayLow ? format(sd.dayLow) : '-',
					div: div,
					yield: yield,
					beta: sd.beta ? sd.beta.toFixed(3) : '-',
					pe: sd.trailingPE ? sd.trailingPE.toFixed(3) : '-',
					bid: sd.bid ? sd.bid : '-',
					bidSize: sd.bidSize ? sd.bidSize : '-',
					ask: sd.ask ? sd.ask : '-',
					askSize: sd.askSize ? sd.askSize : '-',
					marketCap: mc,
					fiftyTwoHigh: sd.fiftyTwoWeekHigh ? format(sd.fiftyTwoWeekHigh) : '-',
					fiftyTwoLow: sd.fiftyTwoWeekLow ? format(sd.fiftyTwoWeekLow) : '-',
					volume: sd.volume ? format(sd.volume, 0, '') : '-',
					recommendation: fd.recommendationKey ? fd.recommendationKey : '-',
					eps: dks.trailingEps ? dks.trailingEps : '-',
					street: sp.address1 ? sp.address1 : '-',
					city: sp.city ? sp.city : '-',
					state: sp.state ? sp.state : '-',
					zip: sp.zip ? sp.zip : '-',
					country: sp.country ? sp.country : '-',
					employees: sp.fullTimeEmployees ? format(sp.fullTimeEmployees, 0, '') : '-',
					phone: sp.phone ? sp.phone : '-',
					website: sp.website ? sp.website : '-',
					sector: sp.sector ? sp.sector : '-',
					industry: sp.industry ? sp.industry : '-',
					summary: sp.longBusinessSummary ? sp.longBusinessSummary : '-',
					name: quote.price.shortName ? quote.price.shortName : '-',
					symbol: quote.price.symbol ? quote.price.symbol : '-',
					price: priceFormatted,
					change: format(price - parseFloat(sd.previousClose)),
					percentChange: (((price / parseFloat(sd.previousClose)) - 1) * 100).toFixed(2) + ' %',
					gain: gain
				};
// 				console.log(quote.price);
				res.render('stock', stockInfo);
			}
		});
	});
	
	//	GET Stocks By Top Movers 
	app.get('/stocks/movers/:exchange?', (req, res) => {
		var exchange = req.params.exchange ? req.params.exchange.toUpperCase() : false;
// 		console.log('\n\n\n', exchange, '\n\n\n');
		if(!exchange || (exchange !== 'NASDAQ' && exchange !== 'NYSE' && exchange !== 'AMEX')) {
			return res.redirect('/stocks/movers/nasdaq');
		}
		Company.findAll({
			where: {
				exchange: exchange
			},
			limit: 25,
			order: [['market_cap', 'DESC']],
		}).then(companies => {
			if(companies) {
												
				var topGainers = {
					one: {},
					two: {},
					three: {},
					four: {},
					five: {}
				};
				var topGains = {
					one: 0,
					two: 0,
					three: 0,
					four: 0,
					five: 0
				}
				var topLosers = {
					one: {},
					two: {},
					three: {},
					four: {},
					five: {}
				};
				var topLosses = {
					one: 0,
					two: 0,
					three: 0,
					four: 0,
					five: 0
				};
				
				findStocksByAPI(companies, [], 0, (stocks) => {

					stocks.forEach(stock => {
						
						if(parseFloat(stock.unformattedChange) > topGains.one) {
							
							topGains.five = topGains.four;
							topGains.four = topGains.three;
							topGains.three = topGains.two;
							topGains.two = topGains.one;
							topGains.one = parseFloat(stock.unformattedChange);
							
							topGainers.five = topGainers.four;
							topGainers.four = topGainers.three;
							topGainers.three = topGainers.two;
							topGainers.two = topGainers.one;
							topGainers.one = stock;
							
						} else if(parseFloat(stock.unformattedChange) > topGains.two) {
							
							topGains.five = topGains.four;
							topGains.four = topGains.three;
							topGains.three = topGains.two;
							topGains.two = parseFloat(stock.unformattedChange);
							
							topGainers.five = topGainers.four;
							topGainers.four = topGainers.three;
							topGainers.three = topGainers.two;
							topGainers.two = stock;
							
						} else if(parseFloat(stock.unformattedChange) > topGains.three) {
							
							topGains.five = topGains.four;
							topGains.four = topGains.three;
							topGains.three = parseFloat(stock.unformattedChange);
							
							topGainers.five = topGainers.four;
							topGainers.four = topGainers.three;
							topGainers.three = stock;
							
						} else if(parseFloat(stock.unformattedChange) > topGains.four) {
							
							topGains.five = topGains.four;
							topGains.four = parseFloat(stock.unformattedChange);
							
							topGainers.five = topGainers.four;
							topGainers.four = stock;
							
						} else if(parseFloat(stock.unformattedChange) > topGains.five) {
							
							topGains.five = parseFloat(stock.unformattedChange);
							
							topGainers.five = stock;
							
						}
						
						if(parseFloat(stock.unformattedChange) < topLosses.one) {
							
							topLosses.five = topLosses.four;
							topLosses.four = topLosses.three;
							topLosses.three = topLosses.two;
							topLosses.two = topLosses.one;
							topLosses.one = parseFloat(stock.unformattedChange);
							
							topLosers.five = topLosers.four;
							topLosers.four = topLosers.three;
							topLosers.three = topLosers.two;
							topLosers.two = topLosers.one;
							topLosers.one = stock;
							
						} else if(parseFloat(stock.unformattedChange) < topLosses.two) {
							
							topLosses.five = topLosses.four;
							topLosses.four = topLosses.three;
							topLosses.three = topLosses.two;
							topLosses.two = parseFloat(stock.unformattedChange);
							
							topLosers.five = topLosers.four;
							topLosers.four = topLosers.three;
							topLosers.three = topLosers.two;
							topLosers.two = stock;
							
						} else if(parseFloat(stock.unformattedChange) < topLosses.three) {
							
							topLosses.five = topLosses.four;
							topLosses.four = topLosses.three;
							topLosses.three = parseFloat(stock.unformattedChange);
							
							topLosers.five = topLosers.four;
							topLosers.four = topLosers.three;
							topLosers.three = stock;
							
						} else if(parseFloat(stock.unformattedChange) < topLosses.four) {
							
							topLosses.five = topLosses.four;
							topLosses.four = parseFloat(stock.unformattedChange);
							
							topLosers.five = topLosers.four;
							topLosers.four = stock;
							
						} else if(parseFloat(stock.unformattedChange) < topLosses.five) {
							
							topLosses.five = parseFloat(stock.unformattedChange);
							
							topLosers.five = stock;
							
						}
						
					});

					res.render('movers', {
						topGainers: topGainers,
						topLosers: topLosers,
						exchange: exchange
					});
				});
			}
		});
	});
	
	//	GET Stocks By Volume
	app.get('/stocks/volume/:exchange?', (req, res) => {
		var exchange = req.params.exchange ? req.params.exchange.toUpperCase() : false;
		if(!exchange || (exchange !== 'NASDAQ' && exchange !== 'NYSE' && exchange !== 'AMEX')) {
			return res.redirect('/stocks/volume/nasdaq');
		}
		Company.findAll({
			where: {
				exchange: exchange
			},
			limit: 25,
			order: [['market_cap', 'DESC']]
		}).then(companies => {
			findStocksByAPI(companies, [], 0, (stocks) => {
				var topVolume = {
					one: 0,
					two: 0,
					three: 0,
					four: 0,
					five: 0,
					six: 0,
					seven: 0,
					eight: 0,
					nine: 0,
					ten: 0
				};
				var topStocks = {
					one: {},
					two: {},
					three: {},
					four: {},
					five: {},
					six: {},
					seven: {},
					eight: {},
					nine: {},
					ten: {}
				}
				stocks.forEach(stock => {
					var volume = stock.volume;
					if(parseInt(volume) > topVolume.one) {
						
						topVolume.ten = topVolume.nine;
						topVolume.nine = topVolume.eight;
						topVolume.eight = topVolume.seven;
						topVolume.seven = topVolume.six;
						topVolume.six = topVolume.five;
						topVolume.five = topVolume.four;
						topVolume.four = topVolume.three;
						topVolume.three = topVolume.two;
						topVolume.two = topVolume.one;
						topVolume.one = parseInt(volume);
						
						topStocks.ten = topStocks.nine;
						topStocks.nine = topStocks.eight;
						topStocks.eight = topStocks.seven;
						topStocks.seven = topStocks.six;
						topStocks.six = topStocks.five;
						topStocks.five = topStocks.four;
						topStocks.four = topStocks.three;
						topStocks.three = topStocks.two;
						topStocks.two = topStocks.one;
						topStocks.one = stock;
						
					} else if(parseInt(volume) > topVolume.two) {
						
						topVolume.ten = topVolume.nine;
						topVolume.nine = topVolume.eight;
						topVolume.eight = topVolume.seven;
						topVolume.seven = topVolume.six;
						topVolume.six = topVolume.five;
						topVolume.five = topVolume.four;
						topVolume.four = topVolume.three;
						topVolume.three = topVolume.two;
						topVolume.two = parseInt(volume);
						
						topStocks.ten = topStocks.nine;
						topStocks.nine = topStocks.eight;
						topStocks.eight = topStocks.seven;
						topStocks.seven = topStocks.six;
						topStocks.six = topStocks.five;
						topStocks.five = topStocks.four;
						topStocks.four = topStocks.three;
						topStocks.three = topStocks.two;
						topStocks.two = stock;
						
					} else if(parseInt(volume) > topVolume.three) {
						
						topVolume.ten = topVolume.nine;
						topVolume.nine = topVolume.eight;
						topVolume.eight = topVolume.seven;
						topVolume.seven = topVolume.six;
						topVolume.six = topVolume.five;
						topVolume.five = topVolume.four;
						topVolume.four = topVolume.three;
						topVolume.three = parseInt(volume);
						
						topStocks.ten = topStocks.nine;
						topStocks.nine = topStocks.eight;
						topStocks.eight = topStocks.seven;
						topStocks.seven = topStocks.six;
						topStocks.six = topStocks.five;
						topStocks.five = topStocks.four;
						topStocks.four = topStocks.three;
						topStocks.three = stock;
						
					} else if(parseInt(volume) > topVolume.four) {
						
						topVolume.ten = topVolume.nine;
						topVolume.nine = topVolume.eight;
						topVolume.eight = topVolume.seven;
						topVolume.seven = topVolume.six;
						topVolume.six = topVolume.five;
						topVolume.five = topVolume.four;
						topVolume.four = parseInt(volume);
						
						topStocks.ten = topStocks.nine;
						topStocks.nine = topStocks.eight;
						topStocks.eight = topStocks.seven;
						topStocks.seven = topStocks.six;
						topStocks.six = topStocks.five;
						topStocks.five = topStocks.four;
						topStocks.four = stock;
						
					} else if(parseInt(volume) > topVolume.five) {
						
						topVolume.ten = topVolume.nine;
						topVolume.nine = topVolume.eight;
						topVolume.eight = topVolume.seven;
						topVolume.seven = topVolume.six;
						topVolume.six = topVolume.five;
						topVolume.five = parseInt(volume);
						
						topStocks.ten = topStocks.nine;
						topStocks.nine = topStocks.eight;
						topStocks.eight = topStocks.seven;
						topStocks.seven = topStocks.six;
						topStocks.six = topStocks.five;
						topStocks.five = stock;
						
					} else if(parseInt(volume) > topVolume.six) {
						
						topVolume.ten = topVolume.nine;
						topVolume.nine = topVolume.eight;
						topVolume.eight = topVolume.seven;
						topVolume.seven = topVolume.six;
						topVolume.six = parseInt(volume);
						
						topStocks.ten = topStocks.nine;
						topStocks.nine = topStocks.eight;
						topStocks.eight = topStocks.seven;
						topStocks.seven = topStocks.six;
						topStocks.six = stock;
						
					} else if(parseInt(volume) > topVolume.seven) {
						
						topVolume.ten = topVolume.nine;
						topVolume.nine = topVolume.eight;
						topVolume.eight = topVolume.seven;
						topVolume.seven = parseInt(volume);
						
						topStocks.ten = topStocks.nine;
						topStocks.nine = topStocks.eight;
						topStocks.eight = topStocks.seven;
						topStocks.seven = stock;
						
					} else if(parseInt(volume) > topVolume.eight) {
						
						topVolume.ten = topVolume.nine;
						topVolume.nine = topVolume.eight;
						topVolume.eight = parseInt(volume);
						
						topStocks.ten = topStocks.nine;
						topStocks.nine = topStocks.eight;
						topStocks.eight = stock;
						
					} else if(parseInt(volume) > topVolume.nine) {
						
						topVolume.ten = topVolume.nine;
						topVolume.nine = parseInt(volume);
						
						topStocks.ten = topStocks.nine;
						topStocks.nine = stock;
						
					} else if(parseInt(volume) > topVolume.ten) {
						
						topVolume.ten = parseInt(volume);
						
						topStocks.ten = stock;
						
					}
				});
				var keys = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
				for(var i = 0; i < keys.length; i++) {
					topStocks[keys[i]].volume = format(topStocks[keys[i]].volume, 0, '');
// 					console.log(topStocks[keys[i]]);
				}
				res.render('volume-cody', {
					volume: topStocks,
					exchange: exchange
				});
			});
		});
	});
	
	//	GET Stocks By Market Cap
	app.get('/stocks/marketcap/:exchange?', (req, res) => {
		var exchange = req.params.exchange ? req.params.exchange.toUpperCase() : false;
		if(!exchange || (exchange !== 'NASDAQ' && exchange !== 'NYSE' && exchange !== 'AMEX')) {
			return res.redirect('/stocks/volume/nasdaq');
		}
		Company.findAll({
			where: {
				exchange: exchange
			},
			limit: 10,
			order: [['market_cap', 'DESC']]
		}).then(companies => {
			findStocksByAPI(companies, [], 0, (stocks) => {
				res.render('marketcap-cody', {
					stocks: stocks,
					exchange: exchange
				});
			});
		});
	});
	
	//	GET Stocks By Sector
	app.get('/stocks/sector/:sector?', (req, res) => {
		var sector = req.params.sector;
		
		Company.findAll({
			where: {
				sector: sector
			},
			order: [['market_cap', 'DESC']],
			limit: 10
		}).then(companies => {
			
			findStocksByAPI(companies, [], 0, (stocks) => {
// 				console.log('\n\n\nstocks found:', stocks);
				res.render('sectors', {
					stocks: stocks,
					sector: sector.toUpperCase()
				});
			});
		});
	});
}

var format = (val=0, dec=2, den='$ ') => {
	var fixed = val.toFixed(dec);
	var parts = fixed.toString().split('.');
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return den + parts.join('.');
}

//	Uses Recursion to handle asynchonous API calls, returning an array of stock data into the callback function
function findStocksByAPI(companies, stocks=[], count=0, cb) {
	
	if(count == 0) {
		console.log('\nSearching API for ' + companies.length + ' companies...\n');
	}
	if(count < companies.length) {
		
		yahooFinance.quote({ symbol: companies[count].symbol, modules: ['summaryDetail', 'price' ]}, (err, quote) => {
			if(err) {
				console.log('Unable to find: ', companies[count].symbol);
				count++;
				findStocksByAPI(companies, stocks, count, cb)
			} else {
				var sd = quote.summaryDetail ? quote.summaryDetail : {};
				
				if(sd.ask == 0 && sd.bid == 0) {
					var price = parseFloat(sd.previousClose);
				} else if(sd.ask == 0) {
					var price = parseFloat(sd.bid);
				} else {
					var price = parseFloat(sd.ask);
				}
				
				var change = format(price - parseFloat(sd.previousClose));
				if(parseFloat(change) < 0) {
					var gain = false;
				} else {
					var gain = true;
				}
				
				var data = {
					price: format(price),
					name: quote.price.shortName ? quote.price.shortName : '-',
					symbol: quote.price.symbol ? quote.price.symbol : '-',
					change: format(price - parseFloat(sd.previousClose)),
					unformattedChange: (((price / parseFloat(sd.previousClose)) - 1) * 100),
					percentChange: (((price / parseFloat(sd.previousClose)) - 1) * 100).toFixed(2) + ' %',
					gain: gain ,
					volume: sd.volume ? sd.volume : 0
				};
				
				stocks.push(data);
				console.log(count + ' / ' + companies.length);
				count++;
				findStocksByAPI(companies, stocks, count, cb);
			}
		});
	} else {
		console.log(count + ' / ' + companies.length);
		console.log('\nSearch Complete!\n');
		cb(stocks);
	}
}
