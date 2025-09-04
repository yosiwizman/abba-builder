<script>
	import { onMount } from 'svelte';
	import { knowledge } from '$lib/stores';

	import { getKnowledgeBases } from '$lib/apis/knowledge';
	import Knowledge from '$lib/components/workspace/Knowledge.svelte';

	onMount(async () => {
		await (async () => {
				knowledge.set(await getKnowledgeBases(localStorage.token));
			})();
	});
</script>

{#if $knowledge !== null}
	<Knowledge />
{/if}
