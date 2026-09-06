//#region src/extend.js
function extend() {
	var args = [].slice.call(arguments);
	var deep = false;
	if (typeof args[0] == "boolean") deep = args.shift();
	var result = args[0];
	if (isUnextendable(result)) throw new Error("extendee must be an object");
	var extenders = args.slice(1);
	var len = extenders.length;
	for (var i = 0; i < len; i++) {
		var extender = extenders[i];
		for (var key in extender) if (Object.prototype.hasOwnProperty.call(extender, key)) {
			var value = extender[key];
			if (deep && isCloneable(value)) {
				var base = Array.isArray(value) ? [] : {};
				result[key] = extend(true, Object.prototype.hasOwnProperty.call(result, key) && !isUnextendable(result[key]) ? result[key] : base, value);
			} else result[key] = value;
		}
	}
	return result;
}
function isCloneable(obj) {
	return Array.isArray(obj) || {}.toString.call(obj) == "[object Object]";
}
function isUnextendable(val) {
	return !val || typeof val != "object" && typeof val != "function";
}
//#endregion
//#region src/emitter.js
var Emitter = class {
	on(event, fn) {
		this._callbacks = this._callbacks || {};
		if (!this._callbacks[event]) this._callbacks[event] = [];
		this._callbacks[event].push(fn);
		return this;
	}
	emit(event, ...args) {
		this._callbacks = this._callbacks || {};
		let callbacks = this._callbacks[event];
		if (callbacks) for (let callback of callbacks) callback.apply(this, args);
		if (this.element) this.element.dispatchEvent(this.makeEvent("dropzone:" + event, { args }));
		return this;
	}
	makeEvent(eventName, detail) {
		let params = {
			bubbles: true,
			cancelable: true,
			detail
		};
		if (typeof window.CustomEvent === "function") return new CustomEvent(eventName, params);
		else {
			var evt = document.createEvent("CustomEvent");
			evt.initCustomEvent(eventName, params.bubbles, params.cancelable, params.detail);
			return evt;
		}
	}
	off(event, fn) {
		if (!this._callbacks || arguments.length === 0) {
			this._callbacks = {};
			return this;
		}
		let callbacks = this._callbacks[event];
		if (!callbacks) return this;
		if (arguments.length === 1) {
			delete this._callbacks[event];
			return this;
		}
		for (let i = 0; i < callbacks.length; i++) if (callbacks[i] === fn) {
			callbacks.splice(i, 1);
			break;
		}
		return this;
	}
};
//#endregion
//#region src/options.js
var defaultOptions = {
	/**
	* Has to be specified on elements other than form (or when the form doesn't
	* have an `action` attribute).
	*
	* You can also provide a function that will be called with `files` and
	* `dataBlocks`  and must return the url as string.
	*/
	url: null,
	/**
	* Can be changed to `"put"` if necessary. You can also provide a function
	* that will be called with `files` and must return the method (since `v3.12.0`).
	*/
	method: "post",
	/**
	* Will be set on the XHRequest.
	*/
	withCredentials: false,
	/**
	* The timeout for the XHR requests in milliseconds (since `v4.4.0`).
	* If set to null or 0, no timeout is going to be set.
	*/
	timeout: null,
	/**
	* How many file uploads to process in parallel (See the
	* Enqueuing file uploads documentation section for more info)
	*/
	parallelUploads: 2,
	/**
	* Whether to send multiple files in one request. If
	* this it set to true, then the fallback file input element will
	* have the `multiple` attribute as well. This option will
	* also trigger additional events (like `processingmultiple`). See the events
	* documentation section for more information.
	*/
	uploadMultiple: false,
	/**
	* Whether you want files to be uploaded in chunks to your server. This can't be
	* used in combination with `uploadMultiple`.
	*
	* See [chunksUploaded](#config-chunksUploaded) for the callback to finalise an upload.
	*/
	chunking: false,
	/**
	* If `chunking` is enabled, this defines whether **every** file should be chunked,
	* even if the file size is below chunkSize. This means, that the additional chunk
	* form data will be submitted and the `chunksUploaded` callback will be invoked.
	*/
	forceChunking: false,
	/**
	* If `chunking` is `true`, then this defines the chunk size in bytes.
	*/
	chunkSize: 2097152,
	/**
	* If `true`, the individual chunks of a file are uploaded simultaneously, at
	* most `parallelUploads` of them at a time. Set a number to use a different
	* limit, or `Infinity` to start every chunk at once.
	*/
	parallelChunkUploads: false,
	/**
	* Whether a chunk should be retried if it fails.
	*/
	retryChunks: false,
	/**
	* If `retryChunks` is true, how many times should it be retried.
	*/
	retryChunksLimit: 3,
	/**
	* The maximum filesize (in MiB) that is allowed to be uploaded.
	*/
	maxFilesize: 256,
	/**
	* The name of the file param that gets transferred.
	* **NOTE**: If you have the option  `uploadMultiple` set to `true`, then
	* Dropzone will append `[]` to the name.
	*/
	paramName: "file",
	/**
	* Whether thumbnails for images should be generated
	*/
	createImageThumbnails: true,
	/**
	* In MB. When the filename exceeds this limit, the thumbnail will not be generated.
	*/
	maxThumbnailFilesize: 10,
	/**
	* If `null`, the ratio of the image will be used to calculate it.
	*/
	thumbnailWidth: 120,
	/**
	* The same as `thumbnailWidth`. If both are null, images will not be resized.
	*/
	thumbnailHeight: 120,
	/**
	* How the images should be scaled down in case both, `thumbnailWidth` and `thumbnailHeight` are provided.
	* Can be either `contain` or `crop`.
	*/
	thumbnailMethod: "crop",
	/**
	* If set, images will be resized to these dimensions before being **uploaded**.
	* If only one, `resizeWidth` **or** `resizeHeight` is provided, the original aspect
	* ratio of the file will be preserved.
	*
	* The `options.transformFile` function uses these options, so if the `transformFile` function
	* is overridden, these options don't do anything.
	*/
	resizeWidth: null,
	/**
	* See `resizeWidth`.
	*/
	resizeHeight: null,
	/**
	* The mime type of the resized image (before it gets uploaded to the server).
	* If `null` the original mime type will be used. To force jpeg, for example, use `image/jpeg`.
	* See `resizeWidth` for more information.
	*/
	resizeMimeType: null,
	/**
	* The quality of the resized images. See `resizeWidth`.
	*/
	resizeQuality: .8,
	/**
	* How the images should be scaled down in case both, `resizeWidth` and `resizeHeight` are provided.
	* Can be either `contain` or `crop`.
	*/
	resizeMethod: "contain",
	/**
	* The color to show through transparent parts of a resized image, as any
	* CSS color. Formats without an alpha channel cannot store transparency, so
	* a transparent PNG resized to `image/jpeg` comes out with black where it
	* used to be see-through; setting this to `"#fff"` makes it white instead.
	*
	* `null` leaves transparency alone, which only produces black once the image
	* is encoded to a format that cannot represent it. This has no effect on the
	* preview thumbnails, which are always PNG.
	*/
	resizeTransparencyFill: null,
	/**
	* The base that is used to calculate the **displayed** filesize. You can
	* change this to 1024 if you would rather display kibibytes, mebibytes,
	* etc... 1024 is technically incorrect, because `1024 bytes` are `1 kibibyte`
	* not `1 kilobyte`. You can change this to `1024` if you don't care about
	* validity.
	*/
	filesizeBase: 1e3,
	/**
	* If not `null` defines how many files this Dropzone handles. If it exceeds,
	* the event `maxfilesexceeded` will be called. The dropzone element gets the
	* class `dz-max-files-reached` accordingly so you can provide visual
	* feedback.
	*/
	maxFiles: null,
	/**
	* An optional object to send additional headers to the server. Eg:
	* `{ "My-Awesome-Header": "header value" }`
	*/
	headers: null,
	/**
	* Should the default headers be set or not?
	* Accept: application/json <- for requesting json response
	* Cache-Control: no-cache <- Request shouldnt be cached
	* X-Requested-With: XMLHttpRequest <- We sent the request via XMLHttpRequest
	*/
	defaultHeaders: true,
	/**
	* If `true`, the dropzone element itself will be clickable, if `false`
	* nothing will be clickable.
	*
	* You can also pass an HTML element, a CSS selector (for multiple elements)
	* or an array of those. In that case, all of those elements will trigger an
	* upload when clicked.
	*/
	clickable: true,
	/**
	* Whether hidden files in directories should be ignored.
	*/
	ignoreHiddenFiles: true,
	/**
	* The default implementation of `accept` checks the file's mime type or
	* extension against this list. This is a comma separated list of mime
	* types or file extensions.
	*
	* Eg.: `image/*,application/pdf,.psd`
	*
	* If the Dropzone is `clickable` this option will also be used as
	* [`accept`](https://developer.mozilla.org/en-US/docs/HTML/Element/input#attr-accept)
	* parameter on the hidden file input as well.
	*/
	acceptedFiles: null,
	/**
	* **Deprecated!**
	* Use acceptedFiles instead.
	*/
	acceptedMimeTypes: null,
	/**
	* If false, files will be added to the queue but the queue will not be
	* processed automatically.
	* This can be useful if you need some additional user input before sending
	* files (or if you want want all files sent at once).
	* If you're ready to send the file simply call `myDropzone.processQueue()`.
	*
	* See the [enqueuing file uploads](#enqueuing-file-uploads) documentation
	* section for more information.
	*/
	autoProcessQueue: true,
	/**
	* If false, files added to the dropzone will not be queued by default.
	* You'll have to call `enqueueFile(file)` manually.
	*/
	autoQueue: true,
	/**
	* If `true`, this will add a link to every file preview to remove or cancel (if
	* already uploading) the file. The `dictCancelUpload`, `dictCancelUploadConfirmation`
	* and `dictRemoveFile` options are used for the wording.
	*/
	addRemoveLinks: false,
	/**
	* Defines where to display the file previews – if `null` the
	* Dropzone element itself is used. Can be a plain `HTMLElement` or a CSS
	* selector. The element should have the `dropzone-previews` class so
	* the previews are displayed properly.
	*/
	previewsContainer: null,
	/**
	* Set this to `true` if you don't want previews to be shown.
	*/
	disablePreviews: false,
	/**
	* This is the element the hidden input field (which is used when clicking on the
	* dropzone to trigger file selection) will be appended to. This might
	* be important in case you use frameworks to switch the content of your page.
	*
	* Can be a selector string, or an element directly.
	*/
	hiddenInputContainer: "body",
	/**
	* If null, no capture type will be specified
	* If camera, mobile devices will skip the file selection and choose camera
	* If microphone, mobile devices will skip the file selection and choose the microphone
	* If camcorder, mobile devices will skip the file selection and choose the camera in video mode
	* On apple devices multiple must be set to false.  AcceptedFiles may need to
	* be set to an appropriate mime type (e.g. "image/*", "audio/*", or "video/*").
	*/
	capture: null,
	/**
	* **Deprecated**. Use `renameFile` instead.
	*/
	renameFilename: null,
	/**
	* A function that is invoked before the file is uploaded to the server and renames the file.
	* This function gets the `File` as argument and can use the `file.name`. The actual name of the
	* file that gets used during the upload can be accessed through `file.upload.filename`.
	*/
	renameFile: null,
	/**
	* If `true` the fallback will be forced. This is very useful to test your server
	* implementations first and make sure that everything works as
	* expected without dropzone if you experience problems, and to test
	* how your fallbacks will look.
	*/
	forceFallback: false,
	/**
	* The text used before any files are dropped.
	*/
	dictDefaultMessage: "Drop files here to upload",
	/**
	* The text that replaces the default message text it the browser is not supported.
	*/
	dictFallbackMessage: "Your browser does not support drag'n'drop file uploads.",
	/**
	* The text that will be added before the fallback form.
	* If you provide a  fallback element yourself, or if this option is `null` this will
	* be ignored.
	*/
	dictFallbackText: "Please use the fallback form below to upload your files like in the olden days.",
	/**
	* If the filesize is too big.
	* `{{filesize}}` and `{{maxFilesize}}` will be replaced with the respective configuration values.
	*/
	dictFileTooBig: "File is too big ({{filesize}}MiB). Max filesize: {{maxFilesize}}MiB.",
	/**
	* If the file doesn't match the file type.
	*/
	dictInvalidFileType: "You can't upload files of this type.",
	/**
	* If the file looks like an image but cannot be decoded, so no thumbnail can
	* be generated for it.
	*/
	dictThumbnailError: "Failed to load the image. The file may be corrupted.",
	/**
	* If the server response was invalid.
	* `{{statusCode}}` will be replaced with the servers status code.
	*/
	dictResponseError: "Server responded with {{statusCode}} code.",
	/**
	* If `addRemoveLinks` is true, the text to be used for the cancel upload link.
	*/
	dictCancelUpload: "Cancel upload",
	/**
	* The text that is displayed if an upload was manually canceled
	*/
	dictUploadCanceled: "Upload canceled.",
	/**
	* If `addRemoveLinks` is true, the text to be used for confirmation when cancelling upload.
	*/
	dictCancelUploadConfirmation: "Are you sure you want to cancel this upload?",
	/**
	* If `addRemoveLinks` is true, the text to be used to remove a file.
	*/
	dictRemoveFile: "Remove file",
	/**
	* If this is not null, then the user will be prompted before removing a file.
	*/
	dictRemoveFileConfirmation: null,
	/**
	* Displayed if `maxFiles` is set and exceeded.
	* The string `{{maxFiles}}` will be replaced by the configuration value.
	*/
	dictMaxFilesExceeded: "You cannot upload any more files.",
	/**
	* Allows you to translate the different units. Starting with `tb` for terabytes and going down to
	* `b` for bytes.
	*/
	dictFileSizeUnits: {
		tb: "TB",
		gb: "GB",
		mb: "MB",
		kb: "KB",
		b: "b"
	},
	/**
	* Called when dropzone initialized
	* You can add event listeners here
	*/
	init() {},
	/**
	* Can be an **object** of additional parameters to transfer to the server, **or** a `Function`
	* that gets invoked with the `files`, `xhr` and, if it's a chunked upload, `chunk` arguments. In case
	* of a function, this needs to return a map.
	*
	* The default implementation does nothing for normal uploads, but adds relevant information for
	* chunked uploads.
	*
	* This is the same as adding hidden input fields in the form element.
	*/
	params(files, xhr, chunk) {
		if (chunk) return {
			dzuuid: chunk.file.upload.uuid,
			dzchunkindex: chunk.index,
			dztotalfilesize: chunk.file.size,
			dzchunksize: this.options.chunkSize,
			dztotalchunkcount: chunk.file.upload.totalChunkCount,
			dzchunkbyteoffset: chunk.index * this.options.chunkSize
		};
	},
	/**
	* A function that gets a [file](https://developer.mozilla.org/en-US/docs/DOM/File)
	* and a `done` function as parameters.
	*
	* If the done function is invoked without arguments, the file is "accepted" and will
	* be processed. If you pass an error message, the file is rejected, and the error
	* message will be displayed.
	* This function will not be called if the file is too big or doesn't match the mime types.
	*/
	accept(file, done) {
		return done();
	},
	/**
	* The callback that will be invoked when all chunks have been uploaded for a file.
	* It gets the file for which the chunks have been uploaded as the first parameter,
	* and the `done` function as second. `done()` needs to be invoked when everything
	* needed to finish the upload process is done.
	*/
	chunksUploaded: function(file, done) {
		done();
	},
	/**
	* Sends the file as binary blob in body instead of form data.
	* If this is set, the `params` option will be ignored.
	* It's an error to set this to `true` along with `uploadMultiple` since
	* multiple files cannot be in a single binary body.
	*/
	binaryBody: false,
	/**
	* Gets called when the browser is not supported.
	* The default implementation shows the fallback input field and adds
	* a text.
	*/
	fallback() {
		let messageElement;
		this.element.className = `${this.element.className} dz-browser-not-supported`;
		for (let child of this.element.getElementsByTagName("div")) if (/(^| )dz-message($| )/.test(child.className)) {
			messageElement = child;
			child.className = "dz-message";
			break;
		}
		if (!messageElement) {
			messageElement = Dropzone.createElement("<div class=\"dz-message\"><span></span></div>");
			this.element.appendChild(messageElement);
		}
		let span = messageElement.getElementsByTagName("span")[0];
		if (span) {
			if (span.textContent != null) span.textContent = this.options.dictFallbackMessage;
			else if (span.innerText != null) span.innerText = this.options.dictFallbackMessage;
		}
		return this.element.appendChild(this.getFallbackForm());
	},
	/**
	* Gets called to calculate the thumbnail dimensions.
	*
	* It gets `file`, `width` and `height` (both may be `null`) as parameters and must return an object containing:
	*
	*  - `srcWidth` & `srcHeight` (required)
	*  - `trgWidth` & `trgHeight` (required)
	*  - `srcX` & `srcY` (optional, default `0`)
	*  - `trgX` & `trgY` (optional, default `0`)
	*
	* Those values are going to be used by `ctx.drawImage()`.
	*/
	resize(file, width, height, resizeMethod) {
		let info = {
			srcX: 0,
			srcY: 0,
			srcWidth: file.width,
			srcHeight: file.height
		};
		let srcRatio = file.width / file.height;
		if (width == null && height == null) {
			width = info.srcWidth;
			height = info.srcHeight;
		} else if (width == null) width = height * srcRatio;
		else if (height == null) height = width / srcRatio;
		width = Math.min(width, info.srcWidth);
		height = Math.min(height, info.srcHeight);
		let trgRatio = width / height;
		if (info.srcWidth > width || info.srcHeight > height) {
			if (resizeMethod === "crop") {
				if (srcRatio > trgRatio) {
					info.srcHeight = file.height;
					info.srcWidth = info.srcHeight * trgRatio;
				} else {
					info.srcWidth = file.width;
					info.srcHeight = info.srcWidth / trgRatio;
				}
			} else if (resizeMethod === "contain") {
				if (srcRatio > trgRatio) height = width / srcRatio;
				else width = height * srcRatio;
			} else throw new Error(`Unknown resizeMethod '${resizeMethod}'`);
		}
		info.srcX = (file.width - info.srcWidth) / 2;
		info.srcY = (file.height - info.srcHeight) / 2;
		info.trgWidth = width;
		info.trgHeight = height;
		return info;
	},
	/**
	* Can be used to transform the file (for example, resize an image if necessary).
	*
	* The default implementation uses `resizeWidth` and `resizeHeight` (if provided) and resizes
	* images according to those dimensions.
	*
	* Gets the `file` as the first parameter, and a `done()` function as the second, that needs
	* to be invoked with the file when the transformation is done.
	*/
	transformFile(file, done) {
		if ((this.options.resizeWidth || this.options.resizeHeight) && file.type.match(/image.*/)) return this.resizeImage(file, this.options.resizeWidth, this.options.resizeHeight, this.options.resizeMethod, done);
		else return done(file);
	},
	/**
	* A string that contains the template used for each dropped
	* file. Change it to fulfill your needs but make sure to properly
	* provide all elements.
	*
	* If you want to use an actual HTML element instead of providing a String
	* as a config option, you could create a div with the id `tpl`,
	* put the template inside it and provide the element like this:
	*
	*     document
	*       .querySelector('#tpl')
	*       .innerHTML
	*
	*/
	previewTemplate: "<div class=\"dz-preview dz-file-preview\">\n  <div class=\"dz-image\"><img data-dz-thumbnail draggable=\"false\" /></div>\n  <div class=\"dz-details\">\n    <div class=\"dz-size\"><span data-dz-size></span></div>\n    <div class=\"dz-filename\"><span data-dz-name></span></div>\n  </div>\n  <div class=\"dz-progress\">\n    <span class=\"dz-upload\" data-dz-uploadprogress></span>\n  </div>\n  <div class=\"dz-error-message\"><span data-dz-errormessage></span></div>\n  <div class=\"dz-success-mark\">\n    <svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"white\" xmlns=\"http://www.w3.org/2000/svg\">\n      <path\n        d=\"M10.2071 29.7929L14.2929 25.7071C14.6834 25.3166 15.3166 25.3166 15.7071 25.7071L21.2929 31.2929C21.6834 31.6834 22.3166 31.6834 22.7071 31.2929L38.2929 15.7071C38.6834 15.3166 39.3166 15.3166 39.7071 15.7071L43.7929 19.7929C44.1834 20.1834 44.1834 20.8166 43.7929 21.2071L22.7071 42.2929C22.3166 42.6834 21.6834 42.6834 21.2929 42.2929L10.2071 31.2071C9.81658 30.8166 9.81658 30.1834 10.2071 29.7929Z\"\n      />\n    </svg>\n  </div>\n  <div class=\"dz-error-mark\">\n    <svg width=\"54\" height=\"54\" viewBox=\"0 0 54 54\" fill=\"white\" xmlns=\"http://www.w3.org/2000/svg\">\n      <path\n        d=\"M26.2929 20.2929L19.2071 13.2071C18.8166 12.8166 18.1834 12.8166 17.7929 13.2071L13.2071 17.7929C12.8166 18.1834 12.8166 18.8166 13.2071 19.2071L20.2929 26.2929C20.6834 26.6834 20.6834 27.3166 20.2929 27.7071L13.2071 34.7929C12.8166 35.1834 12.8166 35.8166 13.2071 36.2071L17.7929 40.7929C18.1834 41.1834 18.8166 41.1834 19.2071 40.7929L26.2929 33.7071C26.6834 33.3166 27.3166 33.3166 27.7071 33.7071L34.7929 40.7929C35.1834 41.1834 35.8166 41.1834 36.2071 40.7929L40.7929 36.2071C41.1834 35.8166 41.1834 35.1834 40.7929 34.7929L33.7071 27.7071C33.3166 27.3166 33.3166 26.6834 33.7071 26.2929L40.7929 19.2071C41.1834 18.8166 41.1834 18.1834 40.7929 17.7929L36.2071 13.2071C35.8166 12.8166 35.1834 12.8166 34.7929 13.2071L27.7071 20.2929C27.3166 20.6834 26.6834 20.6834 26.2929 20.2929Z\"\n      />\n    </svg>\n  </div>\n</div>\n",
	drop(e) {
		return this.element.classList.remove("dz-drag-hover");
	},
	dragstart(e) {},
	dragend(e) {
		return this.element.classList.remove("dz-drag-hover");
	},
	dragenter(e) {
		return this.element.classList.add("dz-drag-hover");
	},
	dragover(e) {
		return this.element.classList.add("dz-drag-hover");
	},
	dragleave(e) {
		return this.element.classList.remove("dz-drag-hover");
	},
	paste(e) {},
	reset() {
		return this.element.classList.remove("dz-started");
	},
	addedfile(file) {
		if (this.element === this.previewsContainer) this.element.classList.add("dz-started");
		if (this.previewsContainer && !this.options.disablePreviews) {
			file.previewElement = Dropzone.createElement(this.options.previewTemplate.trim());
			file.previewTemplate = file.previewElement;
			this.previewsContainer.appendChild(file.previewElement);
			for (var node of file.previewElement.querySelectorAll("[data-dz-name]")) node.textContent = file.name;
			for (node of file.previewElement.querySelectorAll("[data-dz-size]")) node.innerHTML = this.filesize(file.size);
			if (this.options.addRemoveLinks) {
				file._removeLink = Dropzone.createElement(`<a class="dz-remove" href="javascript:undefined;" data-dz-remove>${this.options.dictRemoveFile}</a>`);
				file.previewElement.appendChild(file._removeLink);
			}
			let removeFileEvent = (e) => {
				e.preventDefault();
				e.stopPropagation();
				if (file.status === Dropzone.UPLOADING) return Dropzone.confirm(this.options.dictCancelUploadConfirmation, () => this.removeFile(file));
				else if (this.options.dictRemoveFileConfirmation) return Dropzone.confirm(this.options.dictRemoveFileConfirmation, () => this.removeFile(file));
				else return this.removeFile(file);
			};
			for (let removeLink of file.previewElement.querySelectorAll("[data-dz-remove]")) removeLink.addEventListener("click", removeFileEvent);
		}
	},
	removedfile(file) {
		if (file.previewElement != null && file.previewElement.parentNode != null) file.previewElement.parentNode.removeChild(file.previewElement);
		return this._updateMaxFilesReachedClass();
	},
	thumbnail(file, dataUrl) {
		if (file.previewElement) {
			file.previewElement.classList.remove("dz-file-preview");
			for (let thumbnailElement of file.previewElement.querySelectorAll("[data-dz-thumbnail]")) {
				thumbnailElement.alt = file.name;
				thumbnailElement.src = dataUrl;
			}
			return setTimeout(() => file.previewElement.classList.add("dz-image-preview"), 1);
		}
	},
	error(file, message) {
		if (file.previewElement) {
			file.previewElement.classList.add("dz-error");
			if (typeof message !== "string" && message.error) message = message.error;
			for (let node of file.previewElement.querySelectorAll("[data-dz-errormessage]")) node.textContent = message;
		}
	},
	errormultiple() {},
	processing(file) {
		if (file.previewElement) {
			file.previewElement.classList.add("dz-processing");
			if (file._removeLink) return file._removeLink.innerHTML = this.options.dictCancelUpload;
		}
	},
	processingmultiple() {},
	uploadprogress(file, progress, bytesSent) {
		if (file.previewElement) for (let node of file.previewElement.querySelectorAll("[data-dz-uploadprogress]")) if (node.nodeName === "PROGRESS") node.value = progress;
		else node.style.width = `${progress}%`;
	},
	totaluploadprogress() {},
	sending() {},
	sendingmultiple() {},
	success(file) {
		if (file.previewElement) return file.previewElement.classList.add("dz-success");
	},
	successmultiple() {},
	canceled(file) {
		return this.emit("error", file, this.options.dictUploadCanceled);
	},
	canceledmultiple() {},
	complete(file) {
		if (file._removeLink) file._removeLink.innerHTML = this.options.dictRemoveFile;
		if (file.previewElement) return file.previewElement.classList.add("dz-complete");
	},
	completemultiple() {},
	maxfilesexceeded() {},
	maxfilesreached() {},
	queuecomplete() {},
	addedfiles() {},
	/**
	* Called when a dropped folder turns out to have nothing in it at all.
	* Receives the folder's path.
	*/
	emptyfolder() {}
};
//#endregion
//#region src/dropzone.js
var Dropzone = class Dropzone extends Emitter {
	static initClass() {
		this.prototype.Emitter = Emitter;
		this.prototype.events = [
			"drop",
			"dragstart",
			"dragend",
			"dragenter",
			"dragover",
			"dragleave",
			"addedfile",
			"addedfiles",
			"removedfile",
			"thumbnail",
			"error",
			"errormultiple",
			"processing",
			"processingmultiple",
			"uploadprogress",
			"totaluploadprogress",
			"sending",
			"sendingmultiple",
			"success",
			"successmultiple",
			"canceled",
			"canceledmultiple",
			"complete",
			"completemultiple",
			"reset",
			"maxfilesexceeded",
			"maxfilesreached",
			"queuecomplete",
			"emptyfolder"
		];
		this.prototype._thumbnailQueue = [];
		this.prototype._processingThumbnail = false;
	}
	constructor(el, options) {
		super();
		let fallback, left;
		this.element = el;
		this.clickableElements = [];
		this.listeners = [];
		this.files = [];
		if (typeof this.element === "string") this.element = document.querySelector(this.element);
		if (!this.element || this.element.nodeType == null) throw new Error("Invalid dropzone element.");
		if (this.element.dropzone) throw new Error("Dropzone already attached.");
		Dropzone.instances.push(this);
		this.element.dropzone = this;
		let elementOptions = (left = Dropzone.optionsForElement(this.element)) != null ? left : {};
		this.options = extend(true, {}, defaultOptions, elementOptions, options != null ? options : {});
		this.options.previewTemplate = this.options.previewTemplate.replace(/\n*/g, "");
		if (this.options.forceFallback || !Dropzone.isBrowserSupported()) return this.options.fallback.call(this);
		if (this.options.url == null) this.options.url = this.element.getAttribute("action");
		if (!this.options.url) throw new Error("No URL provided.");
		if (this.options.acceptedFiles && this.options.acceptedMimeTypes) throw new Error("You can't provide both 'acceptedFiles' and 'acceptedMimeTypes'. 'acceptedMimeTypes' is deprecated.");
		if (this.options.uploadMultiple && this.options.chunking) throw new Error("You cannot set both: uploadMultiple and chunking.");
		if (this.options.binaryBody && this.options.uploadMultiple) throw new Error("You cannot set both: binaryBody and uploadMultiple.");
		if (this.options.acceptedMimeTypes) {
			this.options.acceptedFiles = this.options.acceptedMimeTypes;
			delete this.options.acceptedMimeTypes;
		}
		if (this.options.renameFilename != null) this.options.renameFile = (file) => this.options.renameFilename.call(this, file.name, file);
		if (typeof this.options.method === "string") this.options.method = this.options.method.toUpperCase();
		if ((fallback = this.getExistingFallback()) && fallback.parentNode) fallback.parentNode.removeChild(fallback);
		if (this.options.previewsContainer !== false) {
			if (this.options.previewsContainer) this.previewsContainer = Dropzone.getElement(this.options.previewsContainer, "previewsContainer");
			else this.previewsContainer = this.element;
		}
		if (this.options.clickable) {
			if (this.options.clickable === true) this.clickableElements = [this.element];
			else this.clickableElements = Dropzone.getElements(this.options.clickable, "clickable");
		}
		this.init();
	}
	getAcceptedFiles() {
		return this.files.filter((file) => file.accepted).map((file) => file);
	}
	getRejectedFiles() {
		return this.files.filter((file) => !file.accepted).map((file) => file);
	}
	getFilesWithStatus(status) {
		return this.files.filter((file) => file.status === status).map((file) => file);
	}
	getQueuedFiles() {
		return this.getFilesWithStatus(Dropzone.QUEUED);
	}
	getUploadingFiles() {
		return this.getFilesWithStatus(Dropzone.UPLOADING);
	}
	getAddedFiles() {
		return this.getFilesWithStatus(Dropzone.ADDED);
	}
	getActiveFiles() {
		return this.files.filter((file) => file.status === Dropzone.UPLOADING || file.status === Dropzone.QUEUED).map((file) => file);
	}
	init() {
		if (this.element.tagName === "form") this.element.setAttribute("enctype", "multipart/form-data");
		if (this.element.classList.contains("dropzone") && !this.element.querySelector(".dz-message")) this.element.appendChild(Dropzone.createElement(`<div class="dz-default dz-message"><button class="dz-button" type="button">${this.options.dictDefaultMessage}</button></div>`));
		if (this.clickableElements.length) {
			let setupHiddenFileInput = () => {
				if (this.hiddenFileInput) this.hiddenFileInput.parentNode.removeChild(this.hiddenFileInput);
				this.hiddenFileInput = document.createElement("input");
				this.hiddenFileInput.setAttribute("type", "file");
				if (this.options.maxFiles === null || this.options.maxFiles > 1) this.hiddenFileInput.setAttribute("multiple", "multiple");
				this.hiddenFileInput.className = "dz-hidden-input";
				if (this.options.acceptedFiles !== null) this.hiddenFileInput.setAttribute("accept", this.options.acceptedFiles);
				if (this.options.capture !== null) this.hiddenFileInput.setAttribute("capture", this.options.capture);
				this.hiddenFileInput.setAttribute("tabindex", "-1");
				this.hiddenFileInput.setAttribute("aria-label", "hidden file upload");
				this.hiddenFileInput.style.visibility = "hidden";
				this.hiddenFileInput.style.position = "absolute";
				this.hiddenFileInput.style.top = "0";
				this.hiddenFileInput.style.left = "0";
				this.hiddenFileInput.style.height = "0";
				this.hiddenFileInput.style.width = "0";
				let ownerForm = this.element.closest("form");
				if (ownerForm && ownerForm.id) this.hiddenFileInput.setAttribute("form", ownerForm.id);
				Dropzone.getElement(this.options.hiddenInputContainer, "hiddenInputContainer").appendChild(this.hiddenFileInput);
				this.hiddenFileInput.addEventListener("change", () => {
					let { files } = this.hiddenFileInput;
					if (files.length) for (let file of files) this.addFile(file);
					this.emit("addedfiles", files);
					setupHiddenFileInput();
				});
			};
			setupHiddenFileInput();
		}
		this.URL = window.URL !== null ? window.URL : window.webkitURL;
		for (let eventName of this.events) this.on(eventName, this.options[eventName]);
		this.on("uploadprogress", () => this.updateTotalUploadProgress());
		this.on("removedfile", () => this.updateTotalUploadProgress());
		this.on("canceled", (file) => this.emit("complete", file));
		this.on("complete", (file) => {
			if (this.getAddedFiles().length === 0 && this.getUploadingFiles().length === 0 && this.getQueuedFiles().length === 0) return setTimeout(() => this.emit("queuecomplete"), 0);
		});
		const containsFiles = function(e) {
			if (e.dataTransfer.types) {
				for (var i = 0; i < e.dataTransfer.types.length; i++) if (e.dataTransfer.types[i] === "Files") return true;
			}
			return false;
		};
		let noPropagation = function(e) {
			if (!containsFiles(e)) return;
			e.stopPropagation();
			if (e.preventDefault) return e.preventDefault();
			else return e.returnValue = false;
		};
		this.listeners = [{
			element: this.element,
			events: {
				dragstart: (e) => {
					return this.emit("dragstart", e);
				},
				dragenter: (e) => {
					noPropagation(e);
					return this.emit("dragenter", e);
				},
				dragover: (e) => {
					let efct;
					try {
						efct = e.dataTransfer.effectAllowed;
					} catch (error) {}
					e.dataTransfer.dropEffect = "move" === efct || "linkMove" === efct ? "move" : "copy";
					noPropagation(e);
					return this.emit("dragover", e);
				},
				dragleave: (e) => {
					return this.emit("dragleave", e);
				},
				drop: (e) => {
					noPropagation(e);
					return this.drop(e);
				},
				dragend: (e) => {
					return this.emit("dragend", e);
				}
			}
		}];
		this.clickableElements.forEach((clickableElement) => {
			return this.listeners.push({
				element: clickableElement,
				events: { click: (evt) => {
					if (clickableElement !== this.element || evt.target === this.element || Dropzone.elementInside(evt.target, this.element.querySelector(".dz-message"))) this.hiddenFileInput.click();
					return true;
				} }
			});
		});
		this.enable();
		return this.options.init.call(this);
	}
	destroy() {
		this.disable();
		this.removeAllFiles(true);
		if (this.hiddenFileInput != null ? this.hiddenFileInput.parentNode : void 0) {
			this.hiddenFileInput.parentNode.removeChild(this.hiddenFileInput);
			this.hiddenFileInput = null;
		}
		delete this.element.dropzone;
		return Dropzone.instances.splice(Dropzone.instances.indexOf(this), 1);
	}
	updateTotalUploadProgress() {
		let totalUploadProgress;
		let totalBytesSent = 0;
		let totalBytes = 0;
		if (this.getActiveFiles().length) {
			for (let file of this.getActiveFiles()) {
				totalBytesSent += file.upload.bytesSent;
				totalBytes += file.upload.total;
			}
			totalUploadProgress = 100 * totalBytesSent / totalBytes;
		} else totalUploadProgress = 100;
		return this.emit("totaluploadprogress", totalUploadProgress, totalBytes, totalBytesSent);
	}
	_getParamName(n) {
		if (typeof this.options.paramName === "function") return this.options.paramName(n);
		else return `${this.options.paramName}${this.options.uploadMultiple ? `[${n}]` : ""}`;
	}
	_renameFile(file) {
		if (typeof this.options.renameFile !== "function") return file.name;
		return this.options.renameFile(file);
	}
	getFallbackForm() {
		let existingFallback, form;
		if (existingFallback = this.getExistingFallback()) return existingFallback;
		let fieldsString = "<div class=\"dz-fallback\">";
		if (this.options.dictFallbackText) fieldsString += `<p>${this.options.dictFallbackText}</p>`;
		fieldsString += `<input type="file" name="${this._getParamName(0)}" ${this.options.uploadMultiple ? "multiple=\"multiple\"" : void 0} /><input type="submit" value="Upload!"></div>`;
		let fields = Dropzone.createElement(fieldsString);
		if (this.element.tagName !== "FORM") {
			form = Dropzone.createElement(`<form action="${this.options.url}" enctype="multipart/form-data" method="${this.options.method}"></form>`);
			form.appendChild(fields);
		} else {
			this.element.setAttribute("enctype", "multipart/form-data");
			this.element.setAttribute("method", this.options.method);
		}
		return form != null ? form : fields;
	}
	getExistingFallback() {
		let getFallback = function(elements) {
			for (let el of elements) if (/(^| )fallback($| )/.test(el.className)) return el;
		};
		for (let tagName of ["div", "form"]) {
			var fallback;
			if (fallback = getFallback(this.element.getElementsByTagName(tagName))) return fallback;
		}
	}
	setupEventListeners() {
		return this.listeners.map((elementListeners) => (() => {
			let result = [];
			for (let event in elementListeners.events) {
				let listener = elementListeners.events[event];
				result.push(elementListeners.element.addEventListener(event, listener, false));
			}
			return result;
		})());
	}
	removeEventListeners() {
		return this.listeners.map((elementListeners) => (() => {
			let result = [];
			for (let event in elementListeners.events) {
				let listener = elementListeners.events[event];
				result.push(elementListeners.element.removeEventListener(event, listener, false));
			}
			return result;
		})());
	}
	disable() {
		this.clickableElements.forEach((element) => element.classList.remove("dz-clickable"));
		this.removeEventListeners();
		this.disabled = true;
		return this.files.map((file) => this.cancelUpload(file));
	}
	enable() {
		delete this.disabled;
		this.clickableElements.forEach((element) => element.classList.add("dz-clickable"));
		return this.setupEventListeners();
	}
	filesize(size) {
		let selectedSize = 0;
		let selectedUnit = "b";
		if (size > 0) {
			let units = [
				"tb",
				"gb",
				"mb",
				"kb",
				"b"
			];
			for (let i = 0; i < units.length; i++) {
				let unit = units[i];
				if (size >= Math.pow(this.options.filesizeBase, 4 - i) / 10) {
					selectedSize = size / Math.pow(this.options.filesizeBase, 4 - i);
					selectedUnit = unit;
					break;
				}
			}
			selectedSize = Math.round(10 * selectedSize) / 10;
		}
		return `<strong>${selectedSize}</strong> ${this.options.dictFileSizeUnits[selectedUnit]}`;
	}
	_updateMaxFilesReachedClass() {
		if (this.options.maxFiles != null && this.getAcceptedFiles().length >= this.options.maxFiles) {
			if (this.getAcceptedFiles().length === this.options.maxFiles) this.emit("maxfilesreached", this.files);
			return this.element.classList.add("dz-max-files-reached");
		} else return this.element.classList.remove("dz-max-files-reached");
	}
	drop(e) {
		if (!e.dataTransfer) return;
		this.emit("drop", e);
		let files = [];
		for (let i = 0; i < e.dataTransfer.files.length; i++) files[i] = e.dataTransfer.files[i];
		if (files.length) {
			let { items } = e.dataTransfer;
			if (items && items.length && items[0].webkitGetAsEntry != null) {
				this._addFilesFromItems(items).then((addedFiles) => {
					this.emit("addedfiles", addedFiles);
				});
				return;
			}
			this.handleFiles(files);
		}
		this.emit("addedfiles", files);
	}
	paste(e) {
		if (__guard__(e != null ? e.clipboardData : void 0, (x) => x.items) == null) return;
		this.emit("paste", e);
		let { items } = e.clipboardData;
		if (items.length) return this._addFilesFromItems(items);
	}
	handleFiles(files) {
		for (let file of files) this.addFile(file);
	}
	_addFilesFromItems(items) {
		let files = [];
		let directories = [];
		for (let item of items) {
			let entry = item.webkitGetAsEntry != null ? item.webkitGetAsEntry() : null;
			if (entry) {
				if (entry.isFile) {
					let file = item.getAsFile();
					this.addFile(file);
					files.push(file);
				} else if (entry.isDirectory) directories.push(this._addFilesFromDirectory(entry, entry.name));
			} else if (item.getAsFile != null && (item.kind == null || item.kind === "file")) {
				let file = item.getAsFile();
				this.addFile(file);
				files.push(file);
			}
		}
		return Promise.all(directories).then((fromDirectories) => files.concat(...fromDirectories));
	}
	_addFilesFromDirectory(directory, path) {
		let dirReader = directory.createReader();
		return new Promise((resolve) => {
			let pending = [];
			let entryCount = 0;
			let settle = () => Promise.all(pending).then((results) => resolve([].concat(...results)));
			let errorHandler = (error) => {
				__guardMethod__(console, "log", (o) => o.log(error));
				settle();
			};
			let readEntries = () => dirReader.readEntries((entries) => {
				if (entries.length > 0) {
					entryCount += entries.length;
					for (let entry of entries) if (entry.isFile) pending.push(new Promise((resolveEntry) => entry.file((file) => {
						if (this.options.ignoreHiddenFiles && file.name.substring(0, 1) === ".") {
							resolveEntry([]);
							return;
						}
						file.fullPath = `${path}/${file.name}`;
						this.addFile(file);
						resolveEntry([file]);
					}, () => resolveEntry([]))));
					else if (entry.isDirectory) pending.push(this._addFilesFromDirectory(entry, `${path}/${entry.name}`));
					readEntries();
					return null;
				}
				if (entryCount === 0) this.emit("emptyfolder", path);
				settle();
				return null;
			}, errorHandler);
			readEntries();
		});
	}
	accept(file, done) {
		if (this.options.maxFilesize && file.size > this.options.maxFilesize * 1024 * 1024) done(this.options.dictFileTooBig.replace("{{filesize}}", Math.round(file.size / 1024 / 10.24) / 100).replace("{{maxFilesize}}", this.options.maxFilesize));
		else if (!Dropzone.isValidFile(file, this.options.acceptedFiles)) done(this.options.dictInvalidFileType);
		else if (this.options.maxFiles != null && this.getAcceptedFiles().length >= this.options.maxFiles) {
			done(this.options.dictMaxFilesExceeded.replace("{{maxFiles}}", this.options.maxFiles));
			this.emit("maxfilesexceeded", file);
		} else this.options.accept.call(this, file, done);
	}
	addFile(file) {
		file.upload = {
			uuid: Dropzone.uuidv4(),
			progress: 0,
			total: file.size,
			bytesSent: 0,
			filename: this._renameFile(file)
		};
		this.files.push(file);
		file.status = Dropzone.ADDED;
		this.emit("addedfile", file);
		this._enqueueThumbnail(file);
		this.accept(file, (error) => {
			if (error) {
				file.accepted = false;
				this._errorProcessing([file], error);
			} else {
				file.accepted = true;
				if (this.options.autoQueue) this.enqueueFile(file);
			}
			this._updateMaxFilesReachedClass();
		});
	}
	enqueueFiles(files) {
		for (let file of files) this.enqueueFile(file);
		return null;
	}
	enqueueFile(file) {
		if (file.status === Dropzone.ADDED && file.accepted === true) {
			file.status = Dropzone.QUEUED;
			if (this.options.autoProcessQueue) return setTimeout(() => this.processQueue(), 0);
		} else throw new Error("This file can't be queued because it has already been processed or was rejected.");
	}
	_enqueueThumbnail(file) {
		if (this.options.createImageThumbnails && file.type.match(/image.*/) && file.size <= this.options.maxThumbnailFilesize * 1024 * 1024) {
			this._thumbnailQueue.push(file);
			return setTimeout(() => this._processThumbnailQueue(), 0);
		}
	}
	_processThumbnailQueue() {
		if (this._processingThumbnail || this._thumbnailQueue.length === 0) return;
		this._processingThumbnail = true;
		let file = this._thumbnailQueue.shift();
		return this.createThumbnail(file, this.options.thumbnailWidth, this.options.thumbnailHeight, this.options.thumbnailMethod, true, (dataUrl) => {
			if (typeof dataUrl === "string") this.emit("thumbnail", file, dataUrl);
			else this.emit("error", file, this.options.dictThumbnailError);
			this._processingThumbnail = false;
			return this._processThumbnailQueue();
		});
	}
	removeFile(file) {
		if (file.status === Dropzone.UPLOADING) this.cancelUpload(file);
		this.files = without(this.files, file);
		this.emit("removedfile", file);
		if (this.files.length === 0) return this.emit("reset");
	}
	removeAllFiles(cancelIfNecessary) {
		if (cancelIfNecessary == null) cancelIfNecessary = false;
		for (let file of this.files.slice()) if (file.status !== Dropzone.UPLOADING || cancelIfNecessary) this.removeFile(file);
		return null;
	}
	resizeImage(file, width, height, resizeMethod, callback) {
		return this.createThumbnail(file, width, height, resizeMethod, true, (dataUrl, canvas) => {
			if (canvas == null) return callback(file);
			else {
				let { resizeMimeType } = this.options;
				if (resizeMimeType == null) resizeMimeType = file.type;
				if (this.options.resizeTransparencyFill != null) {
					let ctx = canvas.getContext("2d");
					ctx.globalCompositeOperation = "destination-over";
					ctx.fillStyle = this.options.resizeTransparencyFill;
					ctx.fillRect(0, 0, canvas.width, canvas.height);
				}
				let resizedDataURL = canvas.toDataURL(resizeMimeType, this.options.resizeQuality);
				if (resizeMimeType === "image/jpeg" || resizeMimeType === "image/jpg") resizedDataURL = ExifRestore.restore(file.dataURL, resizedDataURL);
				return callback(Dropzone.dataURItoBlob(resizedDataURL));
			}
		});
	}
	createThumbnail(file, width, height, resizeMethod, fixOrientation, callback) {
		let fileReader = new FileReader();
		fileReader.onload = () => {
			file.dataURL = fileReader.result;
			if (file.type === "image/svg+xml") {
				if (callback != null) callback(fileReader.result);
				return;
			}
			this.createThumbnailFromUrl(file, width, height, resizeMethod, fixOrientation, callback);
		};
		fileReader.readAsDataURL(file);
	}
	displayExistingFile(mockFile, imageUrl, callback, crossOrigin, resizeThumbnail = true) {
		this.emit("addedfile", mockFile);
		this.emit("complete", mockFile);
		if (!resizeThumbnail) {
			this.emit("thumbnail", mockFile, imageUrl);
			if (callback) callback();
		} else {
			let onDone = (thumbnail) => {
				this.emit("thumbnail", mockFile, thumbnail);
				if (callback) callback();
			};
			mockFile.dataURL = imageUrl;
			this.createThumbnailFromUrl(mockFile, this.options.thumbnailWidth, this.options.thumbnailHeight, this.options.thumbnailMethod, this.options.fixOrientation, onDone, crossOrigin);
		}
	}
	createThumbnailFromUrl(file, width, height, resizeMethod, fixOrientation, callback, crossOrigin) {
		let img = document.createElement("img");
		if (crossOrigin) img.crossOrigin = crossOrigin;
		fixOrientation = getComputedStyle(document.body)["imageOrientation"] == "from-image" ? false : fixOrientation;
		img.onload = () => {
			let loadExif = (callback) => callback(1);
			if (typeof EXIF !== "undefined" && EXIF !== null && fixOrientation) loadExif = (callback) => EXIF.getData(img, function() {
				return callback(EXIF.getTag(this, "Orientation"));
			});
			return loadExif((orientation) => {
				file.width = img.width;
				file.height = img.height;
				let resizeInfo = this.options.resize.call(this, file, width, height, resizeMethod);
				let canvas = document.createElement("canvas");
				let ctx = canvas.getContext("2d");
				canvas.width = resizeInfo.trgWidth;
				canvas.height = resizeInfo.trgHeight;
				if (orientation > 4) {
					canvas.width = resizeInfo.trgHeight;
					canvas.height = resizeInfo.trgWidth;
				}
				switch (orientation) {
					case 2:
						ctx.translate(canvas.width, 0);
						ctx.scale(-1, 1);
						break;
					case 3:
						ctx.translate(canvas.width, canvas.height);
						ctx.rotate(Math.PI);
						break;
					case 4:
						ctx.translate(0, canvas.height);
						ctx.scale(1, -1);
						break;
					case 5:
						ctx.rotate(.5 * Math.PI);
						ctx.scale(1, -1);
						break;
					case 6:
						ctx.rotate(.5 * Math.PI);
						ctx.translate(0, -canvas.width);
						break;
					case 7:
						ctx.rotate(.5 * Math.PI);
						ctx.translate(canvas.height, -canvas.width);
						ctx.scale(-1, 1);
						break;
					case 8:
						ctx.rotate(-.5 * Math.PI);
						ctx.translate(-canvas.height, 0);
				}
				drawImageIOSFix(ctx, img, resizeInfo.srcX != null ? resizeInfo.srcX : 0, resizeInfo.srcY != null ? resizeInfo.srcY : 0, resizeInfo.srcWidth, resizeInfo.srcHeight, resizeInfo.trgX != null ? resizeInfo.trgX : 0, resizeInfo.trgY != null ? resizeInfo.trgY : 0, resizeInfo.trgWidth, resizeInfo.trgHeight);
				let thumbnail = canvas.toDataURL("image/png");
				if (callback != null) return callback(thumbnail, canvas);
			});
		};
		if (callback != null) img.onerror = callback;
		return img.src = file.dataURL;
	}
	processQueue() {
		let { parallelUploads } = this.options;
		let processingLength = this.getUploadingFiles().length;
		let i = processingLength;
		if (processingLength >= parallelUploads) return;
		let queuedFiles = this.getQueuedFiles();
		if (!(queuedFiles.length > 0)) return;
		if (this.options.uploadMultiple) return this.processFiles(queuedFiles.slice(0, parallelUploads - processingLength));
		else while (i < parallelUploads) {
			if (!queuedFiles.length) return;
			this.processFile(queuedFiles.shift());
			i++;
		}
	}
	processFile(file) {
		return this.processFiles([file]);
	}
	processFiles(files) {
		for (let file of files) {
			file.processing = true;
			file.status = Dropzone.UPLOADING;
			this.emit("processing", file);
		}
		if (this.options.uploadMultiple) this.emit("processingmultiple", files);
		return this.uploadFiles(files);
	}
	_getFilesWithXhr(xhr) {
		return this.files.filter((file) => file.xhr === xhr).map((file) => file);
	}
	cancelUpload(file) {
		if (file.status === Dropzone.UPLOADING) {
			let groupedFiles = this._getFilesWithXhr(file.xhr);
			for (let groupedFile of groupedFiles) groupedFile.status = Dropzone.CANCELED;
			if (typeof file.xhr !== "undefined") file.xhr.abort();
			for (let groupedFile of groupedFiles) this.emit("canceled", groupedFile);
			if (this.options.uploadMultiple) this.emit("canceledmultiple", groupedFiles);
		} else if (file.status === Dropzone.ADDED || file.status === Dropzone.QUEUED) {
			file.status = Dropzone.CANCELED;
			this.emit("canceled", file);
			if (this.options.uploadMultiple) this.emit("canceledmultiple", [file]);
		}
		if (this.options.autoProcessQueue) return this.processQueue();
	}
	resolveOption(option, ...args) {
		if (typeof option === "function") return option.apply(this, args);
		return option;
	}
	uploadFile(file) {
		return this.uploadFiles([file]);
	}
	uploadFiles(files) {
		this._transformFiles(files, (transformedFiles) => {
			let chunkSize = Number(this.options.chunkSize);
			if (this.options.chunking) {
				let transformedFile = transformedFiles[0];
				files[0].upload.chunked = this.options.chunking && (this.options.forceChunking || transformedFile.size > chunkSize);
				files[0].upload.totalChunkCount = Math.max(1, Math.ceil(transformedFile.size / chunkSize));
			}
			if (files[0].upload.chunked) {
				let file = files[0];
				let transformedFile = transformedFiles[0];
				file.upload.chunks = [];
				let handleNextChunk = () => {
					let chunkIndex = 0;
					while (file.upload.chunks[chunkIndex] !== void 0) chunkIndex++;
					if (chunkIndex >= file.upload.totalChunkCount) return;
					let start = chunkIndex * chunkSize;
					let end = Math.min(start + chunkSize, transformedFile.size);
					let dataBlock = {
						name: this._getParamName(0),
						data: transformedFile.webkitSlice ? transformedFile.webkitSlice(start, end) : transformedFile.slice(start, end),
						filename: file.upload.filename,
						chunkIndex
					};
					file.upload.chunks[chunkIndex] = {
						file,
						index: chunkIndex,
						dataBlock,
						status: Dropzone.UPLOADING,
						progress: 0,
						retries: 0
					};
					this._uploadData(files, [dataBlock]);
				};
				file.upload.finishedChunkUpload = (chunk, response) => {
					let allFinished = true;
					chunk.status = Dropzone.SUCCESS;
					chunk.dataBlock = null;
					chunk.response = chunk.xhr.responseText;
					chunk.responseHeaders = chunk.xhr.getAllResponseHeaders();
					chunk.xhr = null;
					for (let i = 0; i < file.upload.totalChunkCount; i++) {
						if (file.upload.chunks[i] === void 0) return handleNextChunk();
						if (file.upload.chunks[i].status !== Dropzone.SUCCESS) allFinished = false;
					}
					if (allFinished) this.options.chunksUploaded(file, () => {
						this._finished(files, response, null);
					});
				};
				if (this.options.parallelChunkUploads) {
					let limit = this.options.parallelChunkUploads === true ? this.options.parallelUploads : this.options.parallelChunkUploads;
					let startCount = Math.max(1, Math.min(limit, file.upload.totalChunkCount));
					for (let i = 0; i < startCount; i++) handleNextChunk();
				} else handleNextChunk();
			} else {
				let dataBlocks = [];
				for (let i = 0; i < files.length; i++) dataBlocks[i] = {
					name: this._getParamName(i),
					data: transformedFiles[i],
					filename: files[i].upload.filename
				};
				this._uploadData(files, dataBlocks);
			}
		});
	}
	_getChunk(file, xhr) {
		for (let i = 0; i < file.upload.totalChunkCount; i++) if (file.upload.chunks[i] !== void 0 && file.upload.chunks[i].xhr === xhr) return file.upload.chunks[i];
	}
	_uploadData(files, dataBlocks) {
		let xhr = new XMLHttpRequest();
		for (let file of files) file.xhr = xhr;
		if (files[0].upload.chunked) files[0].upload.chunks[dataBlocks[0].chunkIndex].xhr = xhr;
		let method = this.resolveOption(this.options.method, files, dataBlocks);
		let url = this.resolveOption(this.options.url, files, dataBlocks);
		xhr.open(method, url, true);
		if (this.resolveOption(this.options.timeout, files)) xhr.timeout = this.resolveOption(this.options.timeout, files);
		xhr.withCredentials = !!this.options.withCredentials;
		xhr.onload = (e) => {
			this._finishedUploading(files, xhr, e);
		};
		xhr.ontimeout = () => {
			this._handleUploadError(files, xhr, `Request timedout after ${this.options.timeout / 1e3} seconds`);
		};
		xhr.onerror = () => {
			this._handleUploadError(files, xhr);
		};
		let progressObj = xhr.upload != null ? xhr.upload : xhr;
		progressObj.onprogress = (e) => this._updateFilesUploadProgress(files, xhr, e);
		let headers = this.options.defaultHeaders ? {
			Accept: "application/json",
			"Cache-Control": "no-cache",
			"X-Requested-With": "XMLHttpRequest"
		} : {};
		if (this.options.binaryBody) headers["Content-Type"] = files[0].type;
		if (this.options.headers) extend(headers, this.options.headers);
		for (let headerName in headers) {
			let headerValue = headers[headerName];
			if (headerValue) xhr.setRequestHeader(headerName, headerValue);
		}
		if (this.options.binaryBody) {
			for (let file of files) this.emit("sending", file, xhr);
			if (this.options.uploadMultiple) this.emit("sendingmultiple", files, xhr);
			this.submitRequest(xhr, null, files);
		} else {
			let formData = new FormData();
			if (this.options.params) {
				let additionalParams = this.options.params;
				if (typeof additionalParams === "function") additionalParams = additionalParams.call(this, files, xhr, files[0].upload.chunked ? this._getChunk(files[0], xhr) : null);
				for (let key in additionalParams) {
					let value = additionalParams[key];
					if (Array.isArray(value)) for (let i = 0; i < value.length; i++) formData.append(key, value[i]);
					else formData.append(key, value);
				}
			}
			for (let file of files) this.emit("sending", file, xhr, formData);
			if (this.options.uploadMultiple) this.emit("sendingmultiple", files, xhr, formData);
			this._addFormElementData(formData);
			for (let i = 0; i < dataBlocks.length; i++) {
				let dataBlock = dataBlocks[i];
				formData.append(dataBlock.name, dataBlock.data, dataBlock.filename);
			}
			this.submitRequest(xhr, formData, files);
		}
	}
	_transformFiles(files, done) {
		let transformedFiles = [];
		let doneCounter = 0;
		for (let i = 0; i < files.length; i++) this.options.transformFile.call(this, files[i], (transformedFile) => {
			transformedFiles[i] = transformedFile;
			if (++doneCounter === files.length) done(transformedFiles);
		});
	}
	_addFormElementData(formData) {
		if (this.element.tagName === "FORM") for (let input of this.element.querySelectorAll("input, textarea, select, button")) {
			let inputName = input.getAttribute("name");
			let inputType = input.getAttribute("type");
			if (inputType) inputType = inputType.toLowerCase();
			if (typeof inputName === "undefined" || inputName === null) continue;
			if (input.tagName === "SELECT" && input.hasAttribute("multiple")) {
				for (let option of input.options) if (option.selected) formData.append(inputName, option.value);
			} else if (!inputType || inputType !== "checkbox" && inputType !== "radio" || input.checked) formData.append(inputName, input.value);
		}
	}
	_updateFilesUploadProgress(files, xhr, e) {
		if (!files[0].upload.chunked) for (let file of files) {
			if (file.upload.total && file.upload.bytesSent && file.upload.bytesSent == file.upload.total) continue;
			if (e) {
				file.upload.progress = 100 * e.loaded / e.total;
				file.upload.total = e.total;
				file.upload.bytesSent = e.loaded;
			} else {
				file.upload.progress = 100;
				file.upload.bytesSent = file.upload.total;
			}
			this.emit("uploadprogress", file, file.upload.progress, file.upload.bytesSent);
		}
		else {
			let file = files[0];
			let chunk = this._getChunk(file, xhr);
			if (e) {
				chunk.progress = 100 * e.loaded / e.total;
				chunk.total = e.total;
				chunk.bytesSent = e.loaded;
			} else {
				chunk.progress = 100;
				chunk.bytesSent = chunk.total;
			}
			file.upload.progress = 0;
			file.upload.total = 0;
			file.upload.bytesSent = 0;
			for (let i = 0; i < file.upload.totalChunkCount; i++) if (file.upload.chunks[i] && typeof file.upload.chunks[i].progress !== "undefined") {
				file.upload.progress += file.upload.chunks[i].progress;
				file.upload.total += file.upload.chunks[i].total;
				file.upload.bytesSent += file.upload.chunks[i].bytesSent;
			}
			file.upload.progress = file.upload.progress / file.upload.totalChunkCount;
			this.emit("uploadprogress", file, file.upload.progress, file.upload.bytesSent);
		}
	}
	_finishedUploading(files, xhr, e) {
		let response;
		if (files[0].status === Dropzone.CANCELED) return;
		if (xhr.readyState !== 4) return;
		if (xhr.responseType !== "arraybuffer" && xhr.responseType !== "blob") {
			response = xhr.responseText;
			if (xhr.getResponseHeader("content-type") && ~xhr.getResponseHeader("content-type").indexOf("application/json")) try {
				response = JSON.parse(response);
			} catch (error) {
				e = error;
				response = "Invalid JSON response from server.";
			}
		}
		this._updateFilesUploadProgress(files, xhr);
		if (!(200 <= xhr.status && xhr.status < 300)) this._handleUploadError(files, xhr, response);
		else if (files[0].upload.chunked) files[0].upload.finishedChunkUpload(this._getChunk(files[0], xhr), response);
		else this._finished(files, response, e);
	}
	_handleUploadError(files, xhr, response) {
		if (files[0].status === Dropzone.CANCELED) return;
		if (files[0].upload.chunked && this.options.retryChunks) {
			let chunk = this._getChunk(files[0], xhr);
			if (chunk.retries++ < this.options.retryChunksLimit) {
				this._uploadData(files, [chunk.dataBlock]);
				return;
			} else console.warn("Retried this chunk too often. Giving up.");
		}
		this._errorProcessing(files, response || this.options.dictResponseError.replace("{{statusCode}}", xhr.status), xhr);
	}
	submitRequest(xhr, formData, files) {
		if (xhr.readyState != 1) {
			console.warn("Cannot send this request because the XMLHttpRequest.readyState is not OPENED.");
			return;
		}
		if (this.options.binaryBody) {
			if (files[0].upload.chunked) {
				const chunk = this._getChunk(files[0], xhr);
				xhr.send(chunk.dataBlock.data);
			} else xhr.send(files[0]);
		} else xhr.send(formData);
	}
	_finished(files, responseText, e) {
		for (let file of files) {
			file.status = Dropzone.SUCCESS;
			this.emit("success", file, responseText, e);
			this.emit("complete", file);
		}
		if (this.options.uploadMultiple) {
			this.emit("successmultiple", files, responseText, e);
			this.emit("completemultiple", files);
		}
		if (this.options.autoProcessQueue) return this.processQueue();
	}
	_errorProcessing(files, message, xhr) {
		for (let file of files) {
			file.status = Dropzone.ERROR;
			this.emit("error", file, message, xhr);
			this.emit("complete", file);
		}
		if (this.options.uploadMultiple) {
			this.emit("errormultiple", files, message, xhr);
			this.emit("completemultiple", files);
		}
		if (this.options.autoProcessQueue) return this.processQueue();
	}
	static uuidv4() {
		return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
			let r = Math.random() * 16 | 0;
			return (c === "x" ? r : r & 3 | 8).toString(16);
		});
	}
};
Dropzone.initClass();
Dropzone.options = {};
Dropzone.optionsForElement = function(element) {
	if (element.getAttribute("id")) return Dropzone.options[camelize(element.getAttribute("id"))];
	else return;
};
Dropzone.instances = [];
Dropzone.forElement = function(element) {
	if (typeof element === "string") element = document.querySelector(element);
	if ((element != null ? element.dropzone : void 0) == null) throw new Error("No Dropzone found for given element. This is probably because you're trying to access it before Dropzone had the time to initialize. Use the `init` option to setup any additional observers on your Dropzone.");
	return element.dropzone;
};
Dropzone.discover = function() {
	let dropzones;
	if (document.querySelectorAll) dropzones = document.querySelectorAll(".dropzone");
	else {
		dropzones = [];
		let checkElements = (elements) => (() => {
			let result = [];
			for (let el of elements) if (/(^| )dropzone($| )/.test(el.className)) result.push(dropzones.push(el));
			else result.push(void 0);
			return result;
		})();
		checkElements(document.getElementsByTagName("div"));
		checkElements(document.getElementsByTagName("form"));
	}
	return (() => {
		let result = [];
		for (let dropzone of dropzones) if (Dropzone.optionsForElement(dropzone) !== false) result.push(new Dropzone(dropzone));
		else result.push(void 0);
		return result;
	})();
};
Dropzone.blockedBrowsers = [/opera.*(Macintosh|Windows Phone).*version\/12/i];
Dropzone.isBrowserSupported = function() {
	let capableBrowser = true;
	if (window.File && window.FileReader && window.FileList && window.Blob && window.FormData && document.querySelector) {
		if (!("classList" in document.createElement("a"))) capableBrowser = false;
		else {
			if (Dropzone.blacklistedBrowsers !== void 0) Dropzone.blockedBrowsers = Dropzone.blacklistedBrowsers;
			for (let regex of Dropzone.blockedBrowsers) if (regex.test(navigator.userAgent)) {
				capableBrowser = false;
				continue;
			}
		}
	} else capableBrowser = false;
	return capableBrowser;
};
Dropzone.dataURItoBlob = function(dataURI) {
	let byteString = atob(dataURI.split(",")[1]);
	let mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
	let ab = new ArrayBuffer(byteString.length);
	let ia = new Uint8Array(ab);
	for (let i = 0, end = byteString.length, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) ia[i] = byteString.charCodeAt(i);
	return new Blob([ab], { type: mimeString });
};
var without = (list, rejectedItem) => list.filter((item) => item !== rejectedItem).map((item) => item);
var camelize = (str) => str.replace(/[-_](\w)/g, (match) => match.charAt(1).toUpperCase());
Dropzone.createElement = function(string) {
	let div = document.createElement("div");
	div.innerHTML = string;
	return div.childNodes[0];
};
Dropzone.elementInside = function(element, container) {
	if (element === container) return true;
	while (element = element.parentNode) if (element === container) return true;
	return false;
};
Dropzone.getElement = function(el, name) {
	let element;
	if (typeof el === "string") element = document.querySelector(el);
	else if (el.nodeType != null) element = el;
	if (element == null) throw new Error(`Invalid \`${name}\` option provided. Please provide a CSS selector or a plain HTML element.`);
	return element;
};
Dropzone.getElements = function(els, name) {
	let el, elements;
	if (els instanceof Array) {
		elements = [];
		try {
			for (el of els) elements.push(this.getElement(el, name));
		} catch (e) {
			elements = null;
		}
	} else if (typeof els === "string") {
		elements = [];
		for (el of document.querySelectorAll(els)) elements.push(el);
	} else if (els.nodeType != null) elements = [els];
	if (elements == null || !elements.length) throw new Error(`Invalid \`${name}\` option provided. Please provide a CSS selector, a plain HTML element or a list of those.`);
	return elements;
};
Dropzone.confirm = function(question, accepted, rejected) {
	if (window.confirm(question)) return accepted();
	else if (rejected != null) return rejected();
};
Dropzone.isValidFile = function(file, acceptedFiles) {
	if (!acceptedFiles) return true;
	acceptedFiles = acceptedFiles.split(",");
	let mimeType = file.type;
	let baseMimeType = mimeType.replace(/\/.*$/, "");
	for (let validType of acceptedFiles) {
		validType = validType.trim();
		if (validType.charAt(0) === ".") {
			if (file.name.toLowerCase().indexOf(validType.toLowerCase(), file.name.length - validType.length) !== -1) return true;
		} else if (validType.endsWith("/*")) {
			if (baseMimeType === validType.replace(/\/.*$/, "")) return true;
		} else if (mimeType === validType) return true;
	}
	return false;
};
if (typeof jQuery !== "undefined" && jQuery !== null) jQuery.fn.dropzone = function(options) {
	return this.each(function() {
		return new Dropzone(this, options);
	});
};
Dropzone.ADDED = "added";
Dropzone.QUEUED = "queued";
Dropzone.ACCEPTED = Dropzone.QUEUED;
Dropzone.UPLOADING = "uploading";
Dropzone.PROCESSING = Dropzone.UPLOADING;
Dropzone.CANCELED = "canceled";
Dropzone.ERROR = "error";
Dropzone.SUCCESS = "success";
var detectVerticalSquash = function(img) {
	let ih = img.naturalHeight;
	let canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = ih;
	let ctx = canvas.getContext("2d");
	ctx.drawImage(img, 0, 0);
	let { data } = ctx.getImageData(1, 0, 1, ih);
	let sy = 0;
	let ey = ih;
	let py = ih;
	while (py > sy) {
		if (data[(py - 1) * 4 + 3] === 0) ey = py;
		else sy = py;
		py = ey + sy >> 1;
	}
	let ratio = py / ih;
	if (ratio === 0) return 1;
	else return ratio;
};
var drawImageIOSFix = function(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh) {
	let vertSquashRatio = detectVerticalSquash(img);
	return ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh / vertSquashRatio);
};
var ExifRestore = class {
	static initClass() {
		this.KEY_STR = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	}
	static encode64(input) {
		let output = "";
		let chr1 = void 0;
		let chr2 = void 0;
		let chr3 = "";
		let enc1 = void 0;
		let enc2 = void 0;
		let enc3 = void 0;
		let enc4 = "";
		let i = 0;
		while (true) {
			chr1 = input[i++];
			chr2 = input[i++];
			chr3 = input[i++];
			enc1 = chr1 >> 2;
			enc2 = (chr1 & 3) << 4 | chr2 >> 4;
			enc3 = (chr2 & 15) << 2 | chr3 >> 6;
			enc4 = chr3 & 63;
			if (isNaN(chr2)) enc3 = enc4 = 64;
			else if (isNaN(chr3)) enc4 = 64;
			output = output + this.KEY_STR.charAt(enc1) + this.KEY_STR.charAt(enc2) + this.KEY_STR.charAt(enc3) + this.KEY_STR.charAt(enc4);
			chr1 = chr2 = chr3 = "";
			enc1 = enc2 = enc3 = enc4 = "";
			if (!(i < input.length)) break;
		}
		return output;
	}
	static restore(origFileBase64, resizedFileBase64) {
		if (!origFileBase64.match("data:image/jpeg;base64,")) return resizedFileBase64;
		let rawImage = this.decode64(origFileBase64.replace("data:image/jpeg;base64,", ""));
		let segments = this.slice2Segments(rawImage);
		let image = this.exifManipulation(resizedFileBase64, segments);
		return `data:image/jpeg;base64,${this.encode64(image)}`;
	}
	static exifManipulation(resizedFileBase64, segments) {
		let exifArray = this.getExifArray(segments);
		let newImageArray = this.insertExif(resizedFileBase64, exifArray);
		return new Uint8Array(newImageArray);
	}
	static getExifArray(segments) {
		let seg = void 0;
		let x = 0;
		while (x < segments.length) {
			seg = segments[x];
			if (seg[0] === 255 & seg[1] === 225) return seg;
			x++;
		}
		return [];
	}
	static insertExif(resizedFileBase64, exifArray) {
		let imageData = resizedFileBase64.replace("data:image/jpeg;base64,", "");
		let buf = this.decode64(imageData);
		let separatePoint = buf.indexOf(255, 3);
		let mae = buf.slice(0, separatePoint);
		let ato = buf.slice(separatePoint);
		let array = mae;
		array = array.concat(exifArray);
		array = array.concat(ato);
		return array;
	}
	static slice2Segments(rawImageArray) {
		let head = 0;
		let segments = [];
		while (true) {
			var length;
			if (rawImageArray[head] === 255 & rawImageArray[head + 1] === 218) break;
			if (rawImageArray[head] === 255 & rawImageArray[head + 1] === 216) head += 2;
			else {
				length = rawImageArray[head + 2] * 256 + rawImageArray[head + 3];
				let endPoint = head + length + 2;
				let seg = rawImageArray.slice(head, endPoint);
				segments.push(seg);
				head = endPoint;
			}
			if (head > rawImageArray.length) break;
		}
		return segments;
	}
	static decode64(input) {
		let chr1 = void 0;
		let chr2 = void 0;
		let chr3 = "";
		let enc1 = void 0;
		let enc2 = void 0;
		let enc3 = void 0;
		let enc4 = "";
		let i = 0;
		let buf = [];
		if (/[^A-Za-z0-9+/=]/g.exec(input)) console.warn("There were invalid base64 characters in the input text.\nValid base64 characters are A-Z, a-z, 0-9, '+', '/',and '='\nExpect errors in decoding.");
		input = input.replace(/[^A-Za-z0-9+/=]/g, "");
		while (true) {
			enc1 = this.KEY_STR.indexOf(input.charAt(i++));
			enc2 = this.KEY_STR.indexOf(input.charAt(i++));
			enc3 = this.KEY_STR.indexOf(input.charAt(i++));
			enc4 = this.KEY_STR.indexOf(input.charAt(i++));
			chr1 = enc1 << 2 | enc2 >> 4;
			chr2 = (enc2 & 15) << 4 | enc3 >> 2;
			chr3 = (enc3 & 3) << 6 | enc4;
			buf.push(chr1);
			if (enc3 !== 64) buf.push(chr2);
			if (enc4 !== 64) buf.push(chr3);
			chr1 = chr2 = chr3 = "";
			enc1 = enc2 = enc3 = enc4 = "";
			if (!(i < input.length)) break;
		}
		return buf;
	}
};
ExifRestore.initClass();
function __guard__(value, transform) {
	return typeof value !== "undefined" && value !== null ? transform(value) : void 0;
}
function __guardMethod__(obj, methodName, transform) {
	if (typeof obj !== "undefined" && obj !== null && typeof obj[methodName] === "function") return transform(obj, methodName);
	else return;
}
//#endregion
export { Dropzone, Dropzone as default };

//# sourceMappingURL=dropzone.mjs.map