window.detectIncognito = function () {
	return new Promise(function (resolve, reject) {
		let browserName = 'Unknown';

		function __callback(isPrivate) {
			resolve({
				isPrivate: isPrivate,
				browserName: browserName,
			});
		}

		function identifyChromium() {
			const ua = navigator.userAgent;
			if (ua.match(/Chrome/)) {
				if (navigator.brave !== undefined) {
					return 'Brave';
				} else if (ua.match(/Edg/)) {
					return 'Edge';
				} else if (ua.match(/OPR/)) {
					return 'Opera';
				}
				return 'Chrome';
			} else {
				return 'Chromium';
			}
		}

		function assertEvalToString(value) {
			return value === eval.toString().length;
		}

		function isSafari() {
			const v = navigator.vendor;
			return (
				v !== undefined && v.indexOf('Apple') === 0 && assertEvalToString(37)
			);
		}

		function isChrome() {
			const v = navigator.vendor;
			return (
				v !== undefined && v.indexOf('Google') === 0 && assertEvalToString(33)
			);
		}

		function isFirefox() {
			return (
				document.documentElement !== undefined &&
				document.documentElement.style.MozAppearance !== undefined &&
				assertEvalToString(37)
			);
		}

		function isMSIE() {
			return navigator.msSaveBlob !== undefined && assertEvalToString(39);
		}

		function newSafariTest() {
			const tmp_name = String(Math.random());

			try {
				const db = window.indexedDB.open(tmp_name, 1);

				db.onupgradeneeded = function (i) {
					const res = i.target?.result;

					try {
						res
							.createObjectStore('test', {
								autoIncrement: true,
							})
							.put(new Blob());

						__callback(false);
					} catch (e) {
						// Handle known errors
						let message = e;

						if (e instanceof Error) {
							message = e.message ?? e;
						}

						if (typeof message !== 'string') {
							return __callback(false);
						}

						const matchesExpectedError = /BlobURLs are not yet supported/.test(
							message
						);

						return __callback(matchesExpectedError);
					} finally {
						res.close();
						window.indexedDB.deleteDatabase(tmp_name);
					}
				};

				// Make sure to reject Promise in case of error
				db.onerror = function (e) {
					reject(new Error(`newSafariTest failed: ${e.message || e}`));
				};
			} catch (e) {
				reject(new Error(`newSafariTest failed: ${e.message || e}`));
			}
		}

		function oldSafariTest() {
			try {
				window.openDatabase(null, null, null, null);
				__callback(false);
			} catch (e) {
				__callback(true);
			}

			try {
				window.localStorage.setItem('test', '1');
				window.localStorage.removeItem('test');
				__callback(false);
			} catch (e) {
				__callback(true);
			}
		}

		/**
		 * Chrome
		 **/

		function getQuotaLimit() {
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
		function storageQuotaChromePrivateTest() {
			navigator.webkitTemporaryStorage.queryUsageAndQuota(
				function (_, quota) {
					const quotaInMib = Math.round(quota / (1024 * 1024));
					const quotaLimitInMib =
						Math.round(getQuotaLimit() / (1024 * 1024)) * 2;

					__callback(quotaInMib < quotaLimitInMib);
				},
				function (e) {
					reject(
						new Error(
							'detectIncognito somehow failed to query storage quota: ' +
								e.message
						)
					);
				}
			);
		}

		// 50 to 75
		function oldChromePrivateTest() {
			const fs = window.webkitRequestFileSystem;
			const success = function () {
				__callback(false);
			};
			const error = function () {
				__callback(true);
			};
			fs(0, 1, success, error);
		}

		function chromePrivateTest() {
			if (self.Promise !== undefined && self.Promise.allSettled !== undefined) {
				storageQuotaChromePrivateTest();
			} else {
				oldChromePrivateTest();
			}
		}

		/**
		 * Firefox
		 **/

		function firefoxPrivateTest() {
			__callback(navigator.serviceWorker === undefined);
		}

		/**
		 * MSIE
		 **/

		function msiePrivateTest() {
			__callback(window.indexedDB === undefined);
		}
		function main() {
			if (isSafari()) {
				browserName = 'Safari';
				safariPrivateTest();
			} else if (isChrome()) {
				browserName = identifyChromium();
				chromePrivateTest();
			} else if (isFirefox()) {
				browserName = 'Firefox';
				firefoxPrivateTest();
			} else if (isMSIE()) {
				browserName = 'Internet Explorer';
				msiePrivateTest();
			} else {
				reject(new Error('detectIncognito cannot determine the browser'));
			}
		}

		main();
	});
};
