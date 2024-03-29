"use strict";

const elem_main=document.getElementById ('main');
const elem_input=document.getElementById ('search');
const elem_help_icon=document.getElementById ('help-icon');
const elem_help=document.getElementById ('help');
const elem_loading=document.getElementById ('loading');
const elem_results=document.getElementById ('results');
const elem_error=document.getElementById ('error');

var help_shown=false;
elem_help_icon.onclick=function(){
	help_shown=!help_shown;
	if (help_shown) {
		elem_help.style.display='block';
		elem_help_icon.classList.add ('active');
	} else {
		elem_help.style.display='none';
		elem_help_icon.classList.remove ('active');
	}
};

function get_result_node (id) {
	var elem;
	for (var i=0; i<=id; i++) {
		elem=elem_results.children[i];
		if (!elem)
			return null;
		if (elem.tagName=='IFRAME')
			id++;
	}
	return elem;
}

function change_selected_result (change) {
	var sel=parseInt (elem_results.dataset.selected);

	if (sel>=0)
		get_result_node (sel).style.outline='none';

	sel+=change;

	if (sel<0)
		sel=0;
	else if (sel>=elem_results.children.length)
		sel=elem_results.children.length-1;

	var elem=get_result_node (sel);
	elem.style.outline='1px dotted black';
	elem.scrollIntoView ({behaviour: 'smooth', block: 'nearest'});
	elem_results.dataset.selected=sel;
}

function toggle_selected_result() {
	var sel=parseInt (elem_results.dataset.selected);
	var elem=get_result_node (sel);
	if (elem)
		elem.onclick();
}

function handle_click () {
	const result_node=this;

	switch (result_node.dataset.has_iframe) {
		case 'no':
			const iframe=document.createElement ('iframe');
			iframe.onload=function(){
				iframe.contentWindow.document.onkeydown=document.onkeydown;
			};
			iframe.src='/proxy/'+result_node.dataset.url;

			if (result_node.nextSibling)
				result_node.parentNode.insertBefore (iframe,result_node.nextSibling)
			else
				result_node.parentNode.appendChild (iframe);

		case 'hidden':
			result_node.nextSibling.style.display='block';
			result_node.dataset.has_iframe='shown';
			break;

		case 'shown':
			result_node.nextSibling.style.display='none';
			result_node.dataset.has_iframe='hidden';
			break;
	}
}

var last_query='';

function handle_response(response) {
	elem_loading.style.display='none';
	elem_results.innerHTML='';

	if (response.length==0) {
		elem_error.innerHTML='No results for "'+last_query+'"';
		elem_error.style.display='block';
		return;
	}

	elem_error.style.display='none';

	for (var i=0; i<response.length; i++) {
		const result=response[i];

		const result_node=document.createElement ('div');
		result_node.dataset.url=result.url;
		result_node.dataset.has_iframe='no';
		result_node.classList.add ('result');
		result_node.onclick=handle_click;

		if ('expected_query' in result) {
			const uni_node=document.createElement ('span');
			uni_node.innerHTML=result.expected_query+' &rightarrow; ';
			uni_node.classList.add ('uni');
			result_node.appendChild (uni_node);
		}

		const lemma_node=document.createElement ('span');
		lemma_node.innerHTML=result.lemma;
		lemma_node.classList.add ('lemma');
		result_node.appendChild (lemma_node);

		if ('vocalization' in result) {
			const voc_node=document.createElement ('span');
			voc_node.innerHTML=result.vocalization;
			voc_node.classList.add ('vocalization');
			result_node.appendChild (voc_node);
		}

		const pos_node=document.createElement ('span');
		pos_node.innerHTML='('+result.pos;
		if ('homonymous_index' in result)
			pos_node.innerHTML+=' '+result.homonymous_index;
		pos_node.innerHTML+=')';
		pos_node.classList.add ('pos');
		result_node.appendChild (pos_node);

		const external_entry_node=document.createElement ('a');
		external_entry_node.innerHTML='&#10154;';
		external_entry_node.href='http://cal.huc.edu/'+result.url;
		external_entry_node.target='_blank';
		external_entry_node.title='View entry on the original CAL';
		external_entry_node.classList.add ('external-entry');
		external_entry_node.onclick=function(e){ e.stopPropagation(); };
		result_node.appendChild (external_entry_node);

		const br_node=document.createElement ('br');
		result_node.appendChild (br_node);

		const gloss_node=document.createElement ('span');
		gloss_node.innerHTML=result.gloss;
		gloss_node.classList.add ('gloss');
		result_node.appendChild (gloss_node);

		elem_results.appendChild (result_node);
	}

	elem_results.dataset.selected=-1;
}

const cache=new Map();

const xhr=new XMLHttpRequest ();
xhr.onreadystatechange=function(){
	if (xhr.readyState!=4)
		return;

	if (xhr.status!=200) {
		elem_loading.style.display='none';
		elem_results.innerHTML='';
		elem_error.innerHTML='Failed to fetch results: '+xhr.statusText;
		elem_error.style.display='block';
		return;
	}

	const response=JSON.parse (xhr.responseText);
	handle_response (response);
	cache.set (last_query,response);
};

document.onkeydown=function(e){
	if (document.activeElement === elem_input) {
		switch (e.keyCode) {
			case 13: // Enter; remove focus
				elem_input.blur();
				return;
			case 74: // j; move down
				elem_input.blur();
				e.preventDefault();
				break;
			default:
				return;
		}
	}

	switch (e.keyCode) {
		case 191: // forward slash: focus search field
			elem_input.focus();
			elem_input.select();
			e.preventDefault();
			break;
		case 74: // j; move down
			change_selected_result (1);
			break;
		case 75: // k; move up
			change_selected_result (-1);
			break;
		case 79: // o; toggle result
			toggle_selected_result();
			break;
	}
};

elem_input.onkeyup=function(){
	const query=elem_input.value;

	if (query==last_query)
		return;

	if (!query.match(new RegExp('^'+elem_input.pattern+'$')))
		return;

	if (query.length<2) {
		elem_results.innerHTML='';
		elem_error.innerHTML='Please enter at least two letters.';
		elem_error.style.display='block';
		return;
	}

	document.title='aCAL: "'+query+'"';

	last_query=query;
	xhr.abort();

	if (cache.has (query)) {
		handle_response (cache.get (query));
		return;
	}

	xhr.open ('GET','search.php?q='+encodeURIComponent (query));
	elem_loading.style.display='block';
	elem_error.innerHTML='';
	xhr.send();
};
elem_input.onkeyup();

(function(){
	const saved_width=localStorage.getItem ('main-width');
	if (saved_width!=null)
		elem_main.style.width=saved_width;
})();
elem_main.onmouseup=function(){
	localStorage.setItem ('main-width',elem_main.style.width);
};
