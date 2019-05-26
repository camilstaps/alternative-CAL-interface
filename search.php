<?php
define ('CAL_BASE_URL','http://cal.huc.edu/');
define ('CAL_REQUEST_URL','http://cal.huc.edu/browseheaders.php');
$query=$_GET['q'];

$response=[];

// Make curl request
$curl_fields=['first3' => $query];
$curl=curl_init ();
curl_setopt ($curl,CURLOPT_URL,CAL_REQUEST_URL);
curl_setopt ($curl,CURLOPT_POST,true);
curl_setopt ($curl,CURLOPT_POSTFIELDS,$curl_fields);
curl_setopt ($curl,CURLOPT_RETURNTRANSFER,true);
$curl_response=curl_exec ($curl);

// Split results (can't use XML parser yet because the HTML is very illegal)
$curl_response=str_replace ('</tr>','',$curl_response);
$curl_response=explode ('</table>',$curl_response)[0];
$curl_response=explode ('<tr>',$curl_response);
array_shift ($curl_response);
array_shift ($curl_response);

// Build result objects
foreach ($curl_response as $curl_result) {
	$curl_result=DOMDocument::loadHTML ('<?xml encoding="utf-8"?>'.$curl_result);

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

	$result=['url' => CAL_BASE_URL.$url];

	// PoS: can more than one element be present?
	$pos_nodes=$curl_result->getElementsByTagName ('pos');
	$poss=[];
	foreach ($pos_nodes as $pos_node)
		$poss[]=$pos_node->nodeValue;
	$result['pos']=implode ('; ',$poss);

	// Other information
	$spans=$curl_result->getElementsByTagName ('span');
	foreach ($spans as $span) {
		$cls=$span->getAttribute ('class');
		switch ($cls) {
		case 'biglem':
		case 'lem':
			$result['lemma']=$span->nodeValue;
			break;
		case 'gloss':
			$result['gloss']=trim ($span->nodeValue);
			break;
		default:
			$result['extra'][$cls]=$span->nodeValue;
		}
	}

	$response[]=$result;
}

echo json_encode($response);
