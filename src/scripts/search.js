import { render } from './templatesEngine';

const HIDE_MODIFICATOR = 'hidden';
const VISIBLE_MODIFICATOR = 'visible';
const SELECTED_MODIFICATOR = 'selected';
const SELECTABLE_CLASS = 'selectable';

const URL = new RegExp(
  '^(?:(?:https?|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?!(?:10|127)(?:\\.\\d{1,3}){3})(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))\\.?)(?::\\d{2,5})?(?:[/?#]\\S*)?$',
  'i'
);
const DOMAIN = new RegExp(
  '(?:(?!(?:10|127)(?:\\.\\d{1,3}){3})(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))\\.?)',
  'i'
);
const URL_WITHOUT_PROTOCOL = new RegExp(
  '(?:\\S+(?::\\S*)?@)?(?:(?!(?:10|127)(?:\\.\\d{1,3}){3})(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))\\.?)(?::\\d{2,5})?(?:[/?#]\\S*)?$',
  'i'
);

export default function Search(root, form_id) {
  this.$root = root; // widget container
  this.DOM = this.attachTemplate(form_id);
  this.selectedSuggestion = null;

  const onInputThrottle = this.throttle(this.handleInput, 250); // add delay for too fast typing

  this.DOM.inputField.addEventListener('input', onInputThrottle);
  this.DOM.inputField.addEventListener('click', (e) => { this.handleInputFocus(e); });
  this.DOM.suggestionsContainer.addEventListener('click', (e) => { this.handleLinkClick(e); });
  this.DOM.clearBtn.addEventListener('click', () => { this.handleClearClick(); });
  this.DOM.submitBtn.addEventListener('click', (e) => { this.sendForm(e); });
  window.addEventListener('resize', () => { this.manageOverflowSuggestionsGradients(); });
  this.$root.addEventListener('keydown', (e) => {
    if (e.keyCode === 38 || e.keyCode === 40) {
      this.selectSuggestion(e);
    } else if (e.keyCode === 13) {
      this.handlePressEnter(e);
    }
  });
}

Search.prototype.attachTemplate = function (form_id) { // place markup template and returns elements
  const templateResult = render({
    form_id,
    phrase: '',
    domain: '',
    url: ''
  });
  this.$root.appendChild(templateResult.form); // attach template
  return templateResult;
};

Search.prototype.throttle = function (func, delay) {
  let isThrottle = false;
  let savedArgs = null;
  let savedThis = null;

  function wrapper() {
    if (isThrottle) { // in case of too fast call save current state
      savedArgs = arguments;
      savedThis = this;
      return;
    }

    func.apply(this, arguments); // normal calling

    isThrottle = true;

    setTimeout(() => { // after delay time we call function with the last state
      isThrottle = false;
      if (savedArgs) {
        wrapper.apply(savedThis, savedArgs);
        savedArgs = savedThis = null;
      }
    }, delay);
  }

  return wrapper.bind(this);
};

Search.prototype.handleInput = function (e) {
  const userInput = e.target.value;

  if (userInput.length > 0) {
    this.manageSubmitBtnDisable(false); // enable submit button if input field starts fill

    if (this.checkSuggestionsVisible() && this.hasSelections()) {
      this.removeSelections(); // disable suggestions selection if we continue typing.
      // Only while suggestions dropdown visible and we select any suggestion
    }

    let isValidInput = this.validateURL(userInput);
    if (isValidInput) {
      // If user input is valid URL, then make suggestions dropdown visible,
      // set suggestions texts and hyperlinks and hide text overflow gradients
      // from short suggestions texts
      this.manageSuggestionsDropdownVisibility(true);
      this.setSuggestionsAndLinks(userInput);
      this.manageOverflowSuggestionsGradients();
    } else {
      // If user input is not valid URL, then hide suggestions dropdown
      // and prepare it for next usage
      this.manageSuggestionsDropdownVisibility(false);
      this.clearSuggestionsAndLinks();
    }
  } else {
    // In case of clear user input disable submit button, hide suggestions
    // dropdown and prepare it for next usage
    this.manageSubmitBtnDisable(true);
    this.manageSuggestionsDropdownVisibility(false);
    this.clearSuggestionsAndLinks();
  }
};

Search.prototype.handleInputFocus = function (e) {
  e.target.focus(); // repeat default behaviour

  if (this.checkSuggestionsVisible() && this.hasSelections()) {
    // disable suggestions selection if we focus at input field
    this.removeSelections();
  }
};

Search.prototype.handleLinkClick = function (e) {
  e.preventDefault();
  this.goToLink(e.target);
};

Search.prototype.handleClearClick = function () {
  // Clear input field with submit button disabling and suggestions
  // dropdown hiding:
  this.manageSubmitBtnDisable(true);
  this.manageSuggestionsDropdownVisibility(false);
  this.clearSuggestionsAndLinks();
};

Search.prototype.handlePressEnter = function (e) {
  if (e.target.nodeName === 'INPUT') { // handle only from input field
    if (this.checkSuggestionsVisible() && this.hasSelections()) {
      // If any suggestion were select, redirect to corresponding hyperlink
      let link = this.DOM.suggestionsContainer.querySelector(`.${SELECTABLE_CLASS}.${SELECTED_MODIFICATOR} a`);
      this.goToLink(link);
    }

    this.sendForm(e); // if no suggestions were selected, send a form query
  }
};

Search.prototype.goToLink = function (link) {
  window.location.href = decodeURIComponent(link.getAttribute('href'));
};

Search.prototype.sendForm = function (e) {
  e.preventDefault();

  // Prepare data:
  let formData = new FormData();
  formData.append('id', `${this.DOM.form.id}`);
  formData.append('query', this.DOM.inputField.value);

  // Send form:
  let xhr = new XMLHttpRequest();
  xhr.open('POST', 'http://super-analytics.com');
  xhr.send(formData);

  // After sending clear input field, disable submit button and hide suggestions
  // dropdown:
  this.DOM.inputField.value = '';
  this.manageSubmitBtnDisable(true);
  this.manageSuggestionsDropdownVisibility(false);
  this.clearSuggestionsAndLinks();
};

Search.prototype.validateURL = function (input) {
  return !!input.match(URL);
};

Search.prototype.setSuggestionsAndLinks = function (inputText) {
  this.DOM.phraseLink.textContent = inputText;
  this.DOM.phraseLink.setAttribute(
    'href',
    'http://super-analytics.com?suggestionType=phrase' + encodeURIComponent(`&query=${inputText}`)
  );

  const domain = inputText.match(DOMAIN)[0];
  this.DOM.domainLink.textContent = domain;
  this.DOM.domainLink.setAttribute(
    'href',
    'http://super-analytics.com?suggestionType=domain' + encodeURIComponent(`&query=${domain}`)
  );

  const url = inputText.match(URL_WITHOUT_PROTOCOL)[0];
  this.DOM.urlLink.textContent = url;
  this.DOM.urlLink.setAttribute(
    'href',
    'http://super-analytics.com?suggestionType=url' + encodeURIComponent(`&query=${url}`)
  );
};

Search.prototype.clearSuggestionsAndLinks = function () {
  this.DOM.phraseLink.textContent = '';
  this.DOM.domainLink.textContent = '';
  this.DOM.urlLink.textContent = '';

  this.DOM.phraseLink.parentNode.classList.remove(HIDE_MODIFICATOR);
  this.DOM.domainLink.parentNode.classList.remove(HIDE_MODIFICATOR);
  this.DOM.urlLink.parentNode.classList.remove(HIDE_MODIFICATOR);
};

Search.prototype.checkSuggestionsVisible = function () {
  return this.DOM.suggestionsContainer.classList.contains(VISIBLE_MODIFICATOR);
};

Search.prototype.hasSelections = function () {
  let elem = this.DOM.suggestionsContainer.querySelector(`.${SELECTABLE_CLASS}.${SELECTED_MODIFICATOR}`);
  return !!elem;
};

Search.prototype.addSelectToSuggestion = function (elem) {
  if (!elem.classList.contains(SELECTED_MODIFICATOR)) {
    elem.classList.add(SELECTED_MODIFICATOR);
  }
};

Search.prototype.removeSelections = function (...args) {
  let elem;

  if (args.length > 0) { // an element has been specified by passing to arguments
    elem = args[0];
  } else { // walk through all selectable elements
    elem = this.DOM.suggestionsContainer.querySelector(`.${SELECTED_MODIFICATOR}`);
    this.selectedSuggestion = null; // now all elements isn't selected
  }

  if (elem) {
    elem.classList.remove(SELECTED_MODIFICATOR);
  }
};

Search.prototype.selectSuggestion = function (e) {
  function firstSelect(keyCode) { // if we press key up/key down in input field
    let getChild = (keyCode === 38) ? 'last' : 'first';
    let selectedSuggestion =
      this.DOM.suggestionsContainer.querySelector(`li:${getChild}-child`);

    this.addSelectToSuggestion(selectedSuggestion); // make first/last suggestion selected
    return selectedSuggestion;
  }

  function select(keyCode, selectedSuggestion) { // if we press key up/key down while any suggestion is selected
    let nextSelectedSuggestion;
    let setSpot = 'last';

    // what the key we pressed?
    if (keyCode === 38) {
      nextSelectedSuggestion = selectedSuggestion.previousElementSibling;
    } else if (keyCode === 40) {
      nextSelectedSuggestion = selectedSuggestion.nextElementSibling;
      setSpot = 'first';
    }

    if (!nextSelectedSuggestion ||
        !nextSelectedSuggestion.classList.contains(SELECTABLE_CLASS)) {
      if (setSpot === 'last') { // we want to go to input field from first selected suggestion
        this.DOM.inputField.focus();
      } else {
        nextSelectedSuggestion =
          this.DOM.suggestionsContainer.querySelector(`li:${setSpot}-child`);

      }
    }

    this.removeSelections(selectedSuggestion);
    if (nextSelectedSuggestion) {
      this.addSelectToSuggestion(nextSelectedSuggestion);
    }

    return nextSelectedSuggestion;
  }

  if (e.target.nodeName === 'INPUT') {
    this.selectedSuggestion = (!this.selectedSuggestion) ?
      firstSelect.call(this, e.keyCode) :
      select.call(this, e.keyCode, this.selectedSuggestion);
  }
};

Search.prototype.manageSubmitBtnDisable = function (isDisable) {
  if (isDisable) {
    this.DOM.submitBtn.setAttribute('disabled', '');
  } else {
    this.DOM.submitBtn.removeAttribute('disabled');
  }
};

Search.prototype.manageSuggestionsDropdownVisibility = function (isVisible) {
  if (isVisible) {
    this.DOM.suggestionsContainer.classList.add(VISIBLE_MODIFICATOR);
  } else {
    this.DOM.suggestionsContainer.classList.remove(VISIBLE_MODIFICATOR);
  }
};

Search.prototype.manageOverflowSuggestionsGradients = function () {
  let suggestionsElements = [
    this.DOM.phraseLink.parentNode, this.DOM.domainLink.parentNode, this.DOM.urlLink.parentNode
  ]; // spans of suggestion links

  for (let i = 0, l = suggestionsElements.length; i < l; i++) {
    // Checking absence of text overflow:
    // create a full-width cloned link and compare with our width
    let elem = suggestionsElements[i].cloneNode(true);
    elem.style.display = 'inline-block';
    elem.style.width = 'auto';
    elem.style.fontWeight = 'bold';
    elem.style.visibility = 'hidden';
    document.body.appendChild(elem);


    // If width of cloned link not greater than our width, then hide overflow gradient
    if (!(elem.clientWidth > suggestionsElements[i].clientWidth)) {
      suggestionsElements[i].classList.add(HIDE_MODIFICATOR);
    } else { // or show overflow gradient
      suggestionsElements[i].classList.remove(HIDE_MODIFICATOR);
    }

    elem.remove();
  }
};
