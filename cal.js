"use strict";

const elem_input=document.getElementById ('search');
const elem_help_icon=document.getElementById ('help-icon');
const elem_help=document.getElementById ('help');
const elem_loading=document.getElementById ('loading');
const elem_results=document.getElementById ('results');
const elem_error=document.getElementById ('error');

var help_shown=false;
elem_help_icon.onclick=function(){
	help_shown=!help_shown;
	elem_help.style.display=help_shown ? 'block' : 'none';
};

var last_query='';
elem_input.onkeyup=function(){
	const query=elem_input.value;

	if (query==last_query)
		return;
	last_query=query;

	if (query.length<2) {
		elem_results.innerHTML='';
		elem_error.innerHTML='Please enter at least two letters.';
		elem_error.style.display='block';
		return;
	}

	const xhr=new XMLHttpRequest ();
	xhr.open ('GET','search.php?q='+encodeURIComponent (query));
	xhr.onreadystatechange=function(){
		if (xhr.readyState!=4)
			return;

		elem_loading.style.display='none';
		elem_results.innerHTML='';

		if (xhr.status!=200) {
			elem_error.innerHTML='Failed to fetch results: '+xhr.statusText;
			elem_error.style.display='block';
			return;
		}

		const response=JSON.parse(xhr.responseText);

		if (response.length==0) {
			elem_error.innerHTML='No results for "'+query+'"';
			elem_error.style.display='block';
			return;
		}

		for (var i in response) {
			const result=response[i];

			const result_node=document.createElement ('a');
			result_node.classList.add ('result');
			result_node.href=result.url;
			result_node.target='_blank';

			if ('extra' in result && 'uni' in result.extra) {
				const uni_node=document.createElement ('span');
				uni_node.innerHTML=result.extra.uni+' &rightarrow; ';
				uni_node.classList.add ('uni');
				result_node.appendChild (uni_node);
			}

			const lemma_node=document.createElement ('span');
			lemma_node.innerHTML=result.lemma;
			lemma_node.classList.add ('lemma');
			result_node.appendChild (lemma_node);

			const pos_node=document.createElement ('span');
			pos_node.innerHTML='('+result.pos+')';
			pos_node.classList.add ('pos');
			result_node.appendChild (pos_node);

			const gloss_node=document.createElement ('span');
			gloss_node.innerHTML=result.gloss;
			gloss_node.classList.add ('gloss');
			result_node.appendChild (gloss_node);

			const br_node=document.createElement ('br');
			br_node.style.clear='both';
			result_node.appendChild (br_node);

			elem_results.appendChild (result_node);
		}
	};

	elem_loading.style.display='block';
	elem_error.innerHTML='';

	xhr.send();
};
elem_input.onkeyup();
