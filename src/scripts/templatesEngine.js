let getTemplateRootNode = function (scriptId) {
  let div = document.createElement('div');
  const scriptTag = document.getElementById(scriptId);
  div.innerHTML = scriptTag.innerHTML;
  const result = div.children[0];
  div.removeChild(result);
  return result;
};

let render = function (data) {
  const form = getTemplateRootNode('searchTemplate');

  const inputField = form.querySelector('.search__field');
  const clearBtn = form.querySelector('.search__field-clear');
  const submitBtn = form.querySelector('.search__submit');
  const suggestionsContainer = form.querySelector('.search__suggestions-container');
  const phraseLink = form.querySelector('.search__suggestion.phrase a');
  const domainLink = form.querySelector('.search__suggestion.domain a');
  const urlLink = form.querySelector('.search__suggestion.url a');

  if (data.form_id) {
    form.id = data.form_id;
  }

  if (data.phrase) {
    phraseLink.innerText = data.phrase;
  }

  if (data.domain) {
    domainLink.innerText = data.domain;
  }

  if (data.url) {
    urlLink.innerText = data.url;
  }

  return {
    form, inputField, clearBtn, submitBtn,
    suggestionsContainer, phraseLink, domainLink, urlLink
  };
};

export { render };
