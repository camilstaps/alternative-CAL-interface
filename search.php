<?php
define ('CAL_REQUEST_URL','https://cal.huc.edu/browseSKEYheaders.php');

$query=$_GET['q'];

$response=[];
header ('Content-Type: application/json');

// Make curl request
$curl_fields=['first3' => $query];
$curl=curl_init ();
curl_setopt ($curl,CURLOPT_URL,CAL_REQUEST_URL);
curl_setopt ($curl,CURLOPT_POST,true);
curl_setopt ($curl,CURLOPT_POSTFIELDS,$curl_fields);
curl_setopt ($curl,CURLOPT_RETURNTRANSFER,true);
$curl_response=curl_exec ($curl);

// Split results (can't use XML parser yet because the HTML is very illegal)
$curl_response=str_replace ('</td>','',$curl_response);
$curl_response=str_replace ('</tr><tr>','',$curl_response);
$curl_response=explode ('</table>',$curl_response)[1];
$curl_response=explode ('<td>',$curl_response);

array_shift ($curl_response);

// Build result objects
foreach ($curl_response as $curl_response_item) {
	$curl_result=new DOMDocument();
	$curl_result->loadHTML ('<?xml encoding="utf-8"?>'.$curl_response_item);

	// URL from link
	$url='';
	$links=$curl_result->getElementsByTagName ('a');
	foreach ($links as $link) {
		$url=$links[0]->getAttribute ('href');
		if ($url!='')
			break;
	}

	if ($url=='')
		continue;

	$result=['url' => $url];

	// PoS: can more than one element be present?
	$pos_nodes=$curl_result->getElementsByTagName ('pos');
	if (count ($pos_nodes)>0) {
		$pos_node=$pos_nodes[0];
		$result['pos']=trim ($pos_node->nodeValue);

		// #2 / #3 for homonyms appears next to pos
		if (!is_null ($pos_node->nextSibling))
			$result['homonymous_index']=trim ($pos_node->nextSibling->nodeValue);
	}

	// Other information
	$spans=$curl_result->getElementsByTagName ('span');
	foreach ($spans as $span) {
		$cls=$span->getAttribute ('class');
		switch ($cls) {
		case 'biglem':
		case 'lem':
			$result['lemma']=trim ($span->nodeValue);
			break;
		case 'gloss':
			$result['gloss']=trim ($span->nodeValue);
			break;
		case 'uni':
			if (is_null ($span->previousSibling))
				$result['expected_query']=trim ($span->nodeValue);
			else
				// Probably vocalization, though perhaps uni is used in more cases?
				$result['vocalization']=trim ($span->nodeValue);
			break;
		default:
			$result['extra'][$cls]=trim ($span->nodeValue);
		}
	}

	$response[]=$result;
}

echo json_encode ($response);
