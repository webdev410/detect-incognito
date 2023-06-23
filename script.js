window.checkPrivateBrowsing = function () {
	return new Promise(function (result, error) {
		let userAgentName = 'Unknown';

		function _respond(isIncognito) {
			result({
				isIncognito: isIncognito,
				userAgentName: userAgentName,
			});
		}

		function classifyChromium() {
			const uaString = navigator.userAgent;
			if (uaString.match(/Chrome/)) {
				if (navigator.brave !== undefined) {
					return 'Brave';
				} else if (uaString.match(/Edg/)) {
					return 'Edge';
				} else if (uaString.match(/OPR/)) {
					return 'Opera';
				}
				return 'Chrome';
			} else {
				return 'Chromium';
			}
		}

		function validateEvalToString(value) {
			return value === eval.toString().length;
		}

		function isSafariBrowser() {
			const vendorString = navigator.vendor;
			return (
				vendorString !== undefined &&
				vendorString.indexOf('Apple') === 0 &&
				validateEvalToString(37)
			);
		}

		function isChromeBrowser() {
			const vendorString = navigator.vendor;
			return (
				vendorString !== undefined &&
				vendorString.indexOf('Google') === 0 &&
				validateEvalToString(33)
			);
		}

		function isFirefoxBrowser() {
			return (
				document.documentElement !== undefined &&
				document.documentElement.style.MozAppearance !== undefined &&
				validateEvalToString(37)
			);
		}

		function isMSIEBrowser() {
			return navigator.msSaveBlob !== undefined && validateEvalToString(39);
		}

		function testNewSafari() {
			const tempName = String(Math.random());

			try {
				const tempDb = window.indexedDB.open(tempName, 1);

				tempDb.onupgradeneeded = function (evt) {
					const eventTargetResult = evt.target?.result;

					try {
						eventTargetResult
							.createObjectStore('test', {
								autoIncrement: true,
							})
							.put(new Blob());

						_respond(false);
					} catch (e) {
						// Handle known errors
						let errorMessage = e;

						if (e instanceof Error) {
							errorMessage = e.message ?? e;
						}

						if (typeof errorMessage !== 'string') {
							return _respond(false);
						}

						const errorMatch = /BlobURLs are not yet supported/.test(
							errorMessage
						);

						return _respond(errorMatch);
					} finally {
						eventTargetResult.close();
						window.indexedDB.deleteDatabase(tempName);
					}
				};

				// Make sure to reject Promise in case of error
				tempDb.onerror = function (e) {
					error(new Error(`testNewSafari failed: ${e.message || e}`));
				};
			} catch (e) {
				error(new Error(`testNewSafari failed: ${e.message || e}`));
			}
		}

		function testOldSafari() {
			try {
				window.openDatabase(null, null, null, null);
				_respond(false);
			} catch (e) {
				_respond(true);
			}

			try {
				window.localStorage.setItem('test', '1');
				window.localStorage.removeItem('test');
				_respond(false);
			} catch (e) {
				_respond(true);
			}
		}

		/**
		 * Chrome
		 **/

		function getHeapLimit() {
			const w = window;
			if (
				w.performance !== undefined &&
				w.performance.memory !== undefined &&
				w.performance.memory.jsHeapSizeLimit !== undefined
			) {
				return performance.memory.jsHeapSizeLimit;
			}
			return 1073741824;
		}

		// >= 76
		function testPrivateChromeNew() {
			navigator.webkitTemporaryStorage.queryUsageAndQuota(
				function (_, quota) {
					const quotaMib = Math.round(quota / (1024 * 1024));
					const quotaLimitMib = Math.round(getHeapLimit() / (1024 * 1024)) * 2;

					_respond(quotaMib < quotaLimitMib);
				},
				function (e) {
					error(
						new Error(
							'checkPrivateBrowsing somehow failed to query storage quota: ' +
								e.message
						)
					);
				}
			);
		}

		// 50 to 75
		function testPrivateChromeOld() {
			const fs = window.webkitRequestFileSystem;
			const success = function () {
				_respond(false);
			};
			const fail = function () {
				_respond(true);
			};
			fs(0, 1, success, fail);
		}

		function testPrivateChrome() {
			if (self.Promise !== undefined && self.Promise.allSettled !== undefined) {
				testPrivateChromeNew();
			} else {
				testPrivateChromeOld();
			}
		}

		/**
		 * Firefox
		 **/

		function testPrivateFirefox() {
			_respond(navigator.serviceWorker === undefined);
		}

		/**
		 * MSIE
		 **/

		function testPrivateMSIE() {
			_respond(window.indexedDB === undefined);
		}

		function startCheck() {
			if (isSafariBrowser()) {
				userAgentName = 'Safari';
				testNewSafari();
			} else if (isChromeBrowser()) {
				userAgentName = classifyChromium();
				testPrivateChrome();
			} else if (isFirefoxBrowser()) {
				userAgentName = 'Firefox';
				testPrivateFirefox();
			} else if (isMSIEBrowser()) {
				userAgentName = 'Internet Explorer';
				testPrivateMSIE();
			} else {
				error(new Error('checkPrivateBrowsing cannot determine the browser'));
			}
		}

		startCheck();
	});
};
